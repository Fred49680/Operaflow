-- Migration 042 : Simplification et correction RLS planification
-- Projet : OperaFlow
-- Description : Simplifier la politique RLS pour éviter les erreurs 500
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ TABLE: tbl_planification_activites - Politique simplifiée
-- ============================================================================
DROP POLICY IF EXISTS "Users can read activities based on role" ON public.tbl_planification_activites;

-- Utilisation d'une fonction helper pour éviter la complexité des sous-requêtes
CREATE OR REPLACE FUNCTION public.can_read_activite(user_id UUID, activite_id UUID, activite_site_id UUID, activite_affaire_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_roles TEXT[];
    v_collaborateur_id UUID;
BEGIN
    -- Récupérer les rôles de l'utilisateur
    SELECT ARRAY_AGG(r.name) INTO v_user_roles
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = can_read_activite.user_id;

    -- Vérifier si Admin ou Planificateur (voient tout)
    IF 'Administrateur' = ANY(v_user_roles) OR 'Planificateur' = ANY(v_user_roles) THEN
        RETURN true;
    END IF;

    -- Récupérer l'ID du collaborateur associé à cet utilisateur
    SELECT c.id INTO v_collaborateur_id
    FROM public.collaborateurs c
    WHERE c.user_id = can_read_activite.user_id
    LIMIT 1;

    -- Chef de Chantier / Chargé d'Affaires : voir les activités de leurs affaires
    IF ('Chef de Chantier' = ANY(v_user_roles) OR 'Chargé d''Affaires' = ANY(v_user_roles)) AND v_collaborateur_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.tbl_affaires a
            WHERE a.id = activite_affaire_id
            AND a.charge_affaires_id = v_collaborateur_id
        ) THEN
            RETURN true;
        END IF;
        
        -- Chef de Chantier : voir aussi les activités où il est affecté
        IF 'Chef de Chantier' = ANY(v_user_roles) AND EXISTS (
            SELECT 1 FROM public.tbl_planification_affectations pa
            WHERE pa.activite_id = can_read_activite.activite_id
            AND pa.collaborateur_id = v_collaborateur_id
        ) THEN
            RETURN true;
        END IF;
    END IF;

    -- Responsable d'Activité : voir les activités de ses sites
    IF 'Responsable d''Activité' = ANY(v_user_roles) THEN
        IF EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = can_read_activite.user_id
            AND ur.site_id::UUID = activite_site_id
        ) OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.tbl_affaires a ON a.site_id = ur.site_id::UUID
            WHERE ur.user_id = can_read_activite.user_id
            AND a.id = activite_affaire_id
        ) THEN
            RETURN true;
        END IF;
    END IF;

    -- Techniciens : voir les activités où ils sont affectés
    IF v_collaborateur_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tbl_planification_affectations pa
        WHERE pa.activite_id = can_read_activite.activite_id
        AND pa.collaborateur_id = v_collaborateur_id
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- Politique utilisant la fonction helper
CREATE POLICY "Users can read activities based on role"
    ON public.tbl_planification_activites FOR SELECT
    USING (
        (select auth.role()) = 'authenticated' AND
        public.can_read_activite(
            (select auth.uid()),
            tbl_planification_activites.id,
            tbl_planification_activites.site_id,
            tbl_planification_activites.affaire_id
        )
    );

-- ============================================================================
-- 2️⃣ Optimisation politique de gestion (simplifiée)
-- ============================================================================
DROP POLICY IF EXISTS "Users can manage activities in their scope" ON public.tbl_planification_activites;
CREATE POLICY "Users can manage activities in their scope"
    ON public.tbl_planification_activites FOR ALL
    USING (
        (select auth.role()) = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
                AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

COMMENT ON FUNCTION public.can_read_activite(UUID, UUID, UUID, UUID) IS 
    'Fonction helper pour vérifier les permissions de lecture des activités (évite complexité RLS)';

COMMENT ON POLICY "Users can read activities based on role" ON public.tbl_planification_activites IS 
    'Politique RLS simplifiée utilisant fonction helper pour meilleures performances';

