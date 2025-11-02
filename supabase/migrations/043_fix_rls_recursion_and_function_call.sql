-- Migration 043 : Correction récursion RLS et appel fonction
-- Projet : OperaFlow
-- Description : Corriger la récursion infinie et simplifier la politique RLS sans fonction helper
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ SUPPRESSION de la fonction helper qui cause la récursion
-- ============================================================================
DROP FUNCTION IF EXISTS public.can_read_activite(UUID, UUID, UUID, UUID);

-- ============================================================================
-- 2️⃣ NOUVELLE politique RLS simplifiée SANS fonction helper
-- ============================================================================
DROP POLICY IF EXISTS "Users can read activities based on role" ON public.tbl_planification_activites;

-- Politique simplifiée sans sous-requêtes complexes sur collaborateurs
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
            -- Chargé d'Affaires / Chef de Chantier : voir les activités via affectations (évite récursion)
            -- Utilisation d'une jointure directe avec user_id pour éviter la table collaborateurs
            EXISTS (
                SELECT 1 FROM public.tbl_planification_affectations pa
                WHERE pa.activite_id = tbl_planification_activites.id
                AND pa.collaborateur_id IN (
                    SELECT c.id FROM public.collaborateurs c 
                    WHERE c.user_id = (select auth.uid())
                )
            ) OR
            -- Chargé d'Affaires / Chef de Chantier : voir les activités de leurs affaires
            EXISTS (
                SELECT 1 FROM public.tbl_affaires a
                WHERE a.id = tbl_planification_activites.affaire_id
                AND a.charge_affaires_id IN (
                    SELECT c.id FROM public.collaborateurs c 
                    WHERE c.user_id = (select auth.uid())
                )
            )
        )
    );

COMMENT ON POLICY "Users can read activities based on role" ON public.tbl_planification_activites IS 
    'Politique RLS simplifiée sans fonction helper pour éviter récursion infinie';

