-- Migration 044 : Correction finale récursion RLS collaborateurs
-- Projet : OperaFlow
-- Description : Éviter complètement l'accès à collaborateurs dans la politique RLS pour éviter récursion
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ Fonction helper SECURITY DEFINER pour obtenir collaborateur_id sans déclencher RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_collaborateur_id_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_collaborateur_id UUID;
BEGIN
    -- Cette fonction bypass RLS grâce à SECURITY DEFINER
    SELECT id INTO v_collaborateur_id
    FROM public.collaborateurs
    WHERE user_id = p_user_id
    LIMIT 1;
    
    RETURN v_collaborateur_id;
END;
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

