-- ============================================
-- Migration 062: Correction RLS pour activites_competences_requises
-- ============================================
-- 
-- Cette migration corrige les politiques RLS de activites_competences_requises
-- pour s'aligner avec les politiques de tbl_planification_activites
-- et permettre l'accès aux utilisateurs qui peuvent lire les activités selon leur rôle
--

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can read activites_competences_requises for their activities" ON public.activites_competences_requises;
DROP POLICY IF EXISTS "Authorized users can manage activites_competences_requises" ON public.activites_competences_requises;

-- Nouvelle politique de lecture : Les utilisateurs peuvent lire les compétences requises
-- des activités qu'ils peuvent lire selon leur rôle (aligné avec tbl_planification_activites)
CREATE POLICY "Users can read activites_competences_requises for their activities"
  ON public.activites_competences_requises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tbl_planification_activites ap
      WHERE ap.id = activites_competences_requises.activite_id
      AND (
        -- Admin voit tout
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = (select auth.uid())
          AND r.name = 'Administrateur'
        )
        OR
        -- Planificateur voit tout
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = (select auth.uid())
          AND r.name = 'Planificateur'
        )
        OR
        -- Utilisateur a créé l'activité
        ap.created_by = (select auth.uid())
        OR
        -- Responsable d'Activité : voir les activités de ses sites
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          WHERE ur.user_id = (select auth.uid())
          AND r.name = 'Responsable d''Activité'
          AND (
            ur.site_id::UUID = ap.site_id
            OR EXISTS (
              SELECT 1 FROM public.tbl_affaires a
              WHERE a.id = ap.affaire_id
              AND a.site_id = ur.site_id::UUID
            )
          )
        )
        OR
        -- Chargé d'Affaires / Chef de Chantier : voir les activités de leurs affaires
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          JOIN public.collaborateurs c ON c.user_id = (select auth.uid())
          WHERE ur.user_id = (select auth.uid())
          AND r.name IN ('Chargé d''Affaires', 'Chef de Chantier')
          AND EXISTS (
            SELECT 1 FROM public.tbl_affaires a
            WHERE a.id = ap.affaire_id
            AND a.charge_affaires_id = c.id
          )
        )
        OR
        -- Chef de Chantier : voir aussi les activités où il est affecté
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON ur.role_id = r.id
          JOIN public.collaborateurs c ON c.user_id = (select auth.uid())
          JOIN public.tbl_planification_affectations pa ON pa.collaborateur_id = c.id
          WHERE ur.user_id = (select auth.uid())
          AND r.name = 'Chef de Chantier'
          AND pa.activite_id = ap.id
        )
        OR
        -- Techniciens : voir les activités où ils sont affectés
        EXISTS (
          SELECT 1 FROM public.collaborateurs c
          JOIN public.tbl_planification_affectations pa ON pa.collaborateur_id = c.id
          WHERE c.user_id = (select auth.uid())
          AND pa.activite_id = ap.id
        )
      )
    )
  );

-- Nouvelle politique de gestion : Seuls les admin, rh, planificateur et responsable d'activité peuvent modifier
CREATE POLICY "Authorized users can manage activites_competences_requises"
  ON public.activites_competences_requises
  FOR ALL
  USING (
    (select auth.role()) = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité', 'Administratif RH', 'Chargé d''Affaires')
    )
  );

COMMENT ON POLICY "Users can read activites_competences_requises for their activities" ON public.activites_competences_requises IS 
  'Politique RLS alignée avec tbl_planification_activites pour permettre lecture selon rôle';

COMMENT ON POLICY "Authorized users can manage activites_competences_requises" ON public.activites_competences_requises IS 
  'Politique RLS optimisée (select auth.uid()) pour performance - gestion compétences requises';

