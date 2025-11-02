-- Migration 044 : Correction finale récursion RLS collaborateurs
-- Projet : OperaFlow
-- Description : Éviter complètement l'accès à collaborateurs dans la politique RLS pour éviter récursion
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ Vue matérialisée simple pour mapping user_id -> collaborateur_id (sans RLS)
-- ============================================================================
-- Créer une vue simple qui ne déclenche pas de récursion
CREATE OR REPLACE VIEW public.v_user_collaborateur_mapping AS
SELECT 
    user_id,
    id as collaborateur_id
FROM public.collaborateurs;

-- RLS désactivé sur cette vue (les vues héritent des politiques de la table source)
-- Mais on peut créer une fonction qui utilise cette vue

-- ============================================================================
-- 2️⃣ Fonction helper SECURITY DEFINER utilisant la vue
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_collaborateur_id_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
PARALLEL SAFE
AS $$
    -- Utiliser directement la vue, SECURITY DEFINER bypass RLS
    SELECT collaborateur_id 
    FROM public.v_user_collaborateur_mapping
    WHERE user_id = p_user_id
    LIMIT 1;
$$;

-- ============================================================================
-- 2️⃣ Supprimer et recréer la politique RLS sans accès direct à collaborateurs
-- ============================================================================
DROP POLICY IF EXISTS "Users can read activities based on role" ON public.tbl_planification_activites;

CREATE POLICY "Users can read activities based on role"
    ON public.tbl_planification_activites FOR SELECT
    USING (
        (select auth.role()) = 'authenticated' AND (
            -- Admin voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Administrateur'
            ) OR
            -- Planificateur voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Planificateur'
            ) OR
            -- Responsable d'Activité voit les activités de ses sites
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
                AND r.name = 'Responsable d''Activité'
                AND (
                    ur.site_id::UUID = tbl_planification_activites.site_id
                    OR EXISTS (
                        SELECT 1 FROM public.tbl_affaires a
                        WHERE a.id = tbl_planification_activites.affaire_id
                        AND a.site_id = ur.site_id::UUID
                    )
                )
            ) OR
            -- Utilisateurs avec affectations : voir les activités où ils sont affectés
            EXISTS (
                SELECT 1 FROM public.tbl_planification_affectations pa
                WHERE pa.activite_id = tbl_planification_activites.id
                AND pa.collaborateur_id = public.get_collaborateur_id_for_user((select auth.uid()))
            ) OR
            -- Chargé d'Affaires / Chef de Chantier : voir les activités de leurs affaires
            EXISTS (
                SELECT 1 FROM public.tbl_affaires a
                WHERE a.id = tbl_planification_activites.affaire_id
                AND a.charge_affaires_id = public.get_collaborateur_id_for_user((select auth.uid()))
            )
        )
    );

COMMENT ON FUNCTION public.get_collaborateur_id_for_user(UUID) IS 
    'Fonction helper SECURITY DEFINER pour obtenir collaborateur_id sans déclencher RLS sur collaborateurs';

COMMENT ON POLICY "Users can read activities based on role" ON public.tbl_planification_activites IS 
    'Politique RLS utilisant fonction SECURITY DEFINER pour éviter récursion infinie sur collaborateurs';

