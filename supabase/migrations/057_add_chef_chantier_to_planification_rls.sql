-- Migration 057 : Ajout du rôle "Chef de Chantier" à la politique de gestion des activités
-- Projet : OperaFlow
-- Description : Permettre aux Chefs de Chantier de gérer les activités
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ Mise à jour de la politique de gestion des activités
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
                AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité', 'Chargé d''Affaires', 'Chef de Chantier')
            )
        )
    );

COMMENT ON POLICY "Users can manage activities in their scope" ON public.tbl_planification_activites IS 
    'Politique RLS permettant aux Administrateurs, Planificateurs, Responsables d''Activité, Chargés d''Affaires et Chefs de Chantier de gérer les activités';

