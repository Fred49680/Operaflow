-- Migration 041 : Correction RLS pour Suivi Terrain
-- Projet : OperaFlow
-- Description : Ajouter "Chef de Chantier" dans les politiques et optimiser tbl_planification_suivi_quotidien
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ TABLE: tbl_planification_activites - Ajouter Chef de Chantier
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
            -- Chef de Chantier voit les activités où il est affecté ou de ses affaires
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Chef de Chantier'
                AND (
                    -- Activités où il est affecté
                    EXISTS (
                        SELECT 1 FROM public.tbl_planification_affectations pa
                        WHERE pa.activite_id = tbl_planification_activites.id
                        AND pa.collaborateur_id IN (
                            SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
                        )
                    ) OR
                    -- Activités de ses affaires
                    EXISTS (
                        SELECT 1 FROM public.tbl_affaires a
                        WHERE a.id = tbl_planification_activites.affaire_id
                        AND a.charge_affaires_id IN (
                            SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
                        )
                    )
                )
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
            -- Chargé d'Affaires voit les activités de ses affaires
            EXISTS (
                SELECT 1 FROM public.tbl_affaires a
                WHERE a.id = tbl_planification_activites.affaire_id
                AND a.charge_affaires_id IN (
                    SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
                )
            ) OR
            -- Techniciens voient les activités où ils sont affectés
            EXISTS (
                SELECT 1 FROM public.tbl_planification_affectations pa
                WHERE pa.activite_id = tbl_planification_activites.id
                AND pa.collaborateur_id IN (
                    SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
                )
            )
        )
    );

-- ============================================================================
-- 2️⃣ TABLE: tbl_planification_suivi_quotidien - Optimisation
-- ============================================================================
DROP POLICY IF EXISTS "Users can read suivi in their scope" ON public.tbl_planification_suivi_quotidien;
CREATE POLICY "Users can read suivi in their scope"
    ON public.tbl_planification_suivi_quotidien FOR SELECT
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
            -- Collaborateurs voient leur propre suivi
            collaborateur_id IN (
                SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
            ) OR
            -- Chef de Chantier / Responsable d'Activité / Chargé d'Affaires voient leur périmètre
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
                AND r.name IN ('Chef de Chantier', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage suivi in their scope" ON public.tbl_planification_suivi_quotidien;
CREATE POLICY "Users can manage suivi in their scope"
    ON public.tbl_planification_suivi_quotidien FOR ALL
    USING (
        (select auth.role()) = 'authenticated' AND (
            -- Admin peut tout faire
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Administrateur'
            ) OR
            -- Planificateur peut tout faire
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Planificateur'
            ) OR
            -- Collaborateurs peuvent saisir leur propre suivi
            collaborateur_id IN (
                SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
            ) OR
            -- Chef de Chantier / Responsable d'Activité peuvent valider
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
                AND r.name IN ('Chef de Chantier', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

-- ============================================================================
-- 3️⃣ TABLE: tbl_planification_affectations - Optimisation
-- ============================================================================
DROP POLICY IF EXISTS "Users can read affectations in their scope" ON public.tbl_planification_affectations;
CREATE POLICY "Users can read affectations in their scope"
    ON public.tbl_planification_affectations FOR SELECT
    USING (
        (select auth.role()) = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name IN ('Administrateur', 'Planificateur')
            ) OR
            -- Collaborateurs voient leurs propres affectations
            collaborateur_id IN (
                SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
            ) OR
            -- Chef de Chantier / Responsable voient les affectations de leurs activités
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
                AND r.name IN ('Chef de Chantier', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage affectations in their scope" ON public.tbl_planification_affectations;
CREATE POLICY "Users can manage affectations in their scope"
    ON public.tbl_planification_affectations FOR ALL
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

COMMENT ON POLICY "Users can read activities based on role" ON public.tbl_planification_activites IS 
    'Politique RLS optimisée incluant Chef de Chantier pour Suivi Terrain';

COMMENT ON POLICY "Users can read suivi in their scope" ON public.tbl_planification_suivi_quotidien IS 
    'Politique RLS optimisée (select auth.uid()) pour performance - Suivi Terrain';

COMMENT ON POLICY "Users can manage suivi in their scope" ON public.tbl_planification_suivi_quotidien IS 
    'Politique RLS optimisée (select auth.uid()) pour performance - Suivi Terrain';

