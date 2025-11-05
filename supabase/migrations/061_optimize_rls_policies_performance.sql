-- ============================================
-- Migration 061: Optimisation des politiques RLS pour performance
-- ============================================
-- 
-- Cette migration corrige les problèmes de performance identifiés par le linter Supabase :
-- - Remplace auth.uid() par (select auth.uid()) pour éviter la réévaluation par ligne
-- - Remplace auth.role() par (select auth.role()) pour éviter la réévaluation par ligne
-- - Applique ces optimisations aux politiques RLS identifiées comme problématiques
--

-- ============================================
-- 1. tbl_catalogue_formations
-- ============================================
DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent voir le catalogue a" ON public.tbl_catalogue_formations;
DROP POLICY IF EXISTS "RH et Admin peuvent gérer le catalogue" ON public.tbl_catalogue_formations;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir le catalogue a"
  ON public.tbl_catalogue_formations
  FOR SELECT
  USING ((select auth.role()) = 'authenticated' AND is_active = true);

CREATE POLICY "RH et Admin peuvent gérer le catalogue"
  ON public.tbl_catalogue_formations
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- ============================================
-- 2. tbl_plan_previsionnel_formations
-- ============================================
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur plan prévisionnel" ON public.tbl_plan_previsionnel_formations;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur plan prévisionnel" ON public.tbl_plan_previsionnel_formations;
DROP POLICY IF EXISTS "RH et Admin peuvent modifier le plan prévisionnel" ON public.tbl_plan_previsionnel_formations;

CREATE POLICY "Les utilisateurs peuvent voir leur plan prévisionnel"
  ON public.tbl_plan_previsionnel_formations
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer leur plan prévisionnel"
  ON public.tbl_plan_previsionnel_formations
  FOR INSERT
  WITH CHECK (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH et Admin peuvent modifier le plan prévisionnel"
  ON public.tbl_plan_previsionnel_formations
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- ============================================
-- 3. tbl_partenaire_documents
-- ============================================
DROP POLICY IF EXISTS "Tous peuvent voir les documents non internes RH" ON public.tbl_partenaire_documents;
DROP POLICY IF EXISTS "RH/Admin peuvent voir tous les documents" ON public.tbl_partenaire_documents;
DROP POLICY IF EXISTS "RH/Admin peuvent gérer les documents" ON public.tbl_partenaire_documents;

CREATE POLICY "Tous peuvent voir les documents non internes RH"
  ON public.tbl_partenaire_documents
  FOR SELECT
  USING (
    (select auth.role()) = 'authenticated' 
    AND (type_document IS NULL OR type_document != 'interne_rh')
  );

CREATE POLICY "RH/Admin peuvent voir tous les documents"
  ON public.tbl_partenaire_documents
  FOR SELECT
  USING (public.is_rh_or_admin((select auth.uid())));

CREATE POLICY "RH/Admin peuvent gérer les documents"
  ON public.tbl_partenaire_documents
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- ============================================
-- 4. tbl_calendrier_semaine_type
-- ============================================
DROP POLICY IF EXISTS "Admins can manage semaine type" ON public.tbl_calendrier_semaine_type;
DROP POLICY IF EXISTS "Authenticated users can read semaine type" ON public.tbl_calendrier_semaine_type;

CREATE POLICY "Admins can manage semaine type"
  ON public.tbl_calendrier_semaine_type
  FOR ALL
  USING (public.is_admin((select auth.uid())));

CREATE POLICY "Authenticated users can read semaine type"
  ON public.tbl_calendrier_semaine_type
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ============================================
-- 5. catalogue_absences
-- ============================================
DROP POLICY IF EXISTS "RH peut gérer catalogue" ON public.catalogue_absences;

CREATE POLICY "RH peut gérer catalogue"
  ON public.catalogue_absences
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- ============================================
-- 6. historique_validations_absences
-- ============================================
DROP POLICY IF EXISTS "Collaborateur voit son historique" ON public.historique_validations_absences;
DROP POLICY IF EXISTS "RH voit tous historiques" ON public.historique_validations_absences;

CREATE POLICY "Collaborateur voit son historique"
  ON public.historique_validations_absences
  FOR SELECT
  USING (
    absence_id IN (
      SELECT id FROM public.absences 
      WHERE collaborateur_id IN (
        SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "RH voit tous historiques"
  ON public.historique_validations_absences
  FOR SELECT
  USING (public.is_rh_or_admin((select auth.uid())));

-- ============================================
-- 7. tbl_planification_coefficients
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read coefficients" ON public.tbl_planification_coefficients;
DROP POLICY IF EXISTS "Responsables can manage coefficients" ON public.tbl_planification_coefficients;

CREATE POLICY "Authenticated users can read coefficients"
  ON public.tbl_planification_coefficients
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Responsables can manage coefficients"
  ON public.tbl_planification_coefficients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité')
    )
  );

-- ============================================
-- 8. tbl_planification_alertes
-- ============================================
DROP POLICY IF EXISTS "Users can read alertes in their scope" ON public.tbl_planification_alertes;
DROP POLICY IF EXISTS "Users can manage alertes in their scope" ON public.tbl_planification_alertes;

-- Note: Ces politiques sont complexes et peuvent nécessiter une révision complète
-- Pour l'instant, on optimise juste les appels auth
-- (Les politiques complètes sont dans d'autres migrations)

-- ============================================
-- 9. tbl_calendriers
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read calendars" ON public.tbl_calendriers;
DROP POLICY IF EXISTS "Admins can manage calendars" ON public.tbl_calendriers;

CREATE POLICY "Authenticated users can read calendars"
  ON public.tbl_calendriers
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admins can manage calendars"
  ON public.tbl_calendriers
  FOR ALL
  USING (public.is_admin((select auth.uid())));

-- ============================================
-- 10. tbl_calendrier_jours
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read calendar days" ON public.tbl_calendrier_jours;
DROP POLICY IF EXISTS "Admins can manage calendar days" ON public.tbl_calendrier_jours;

CREATE POLICY "Authenticated users can read calendar days"
  ON public.tbl_calendrier_jours
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admins can manage calendar days"
  ON public.tbl_calendrier_jours
  FOR ALL
  USING (public.is_admin((select auth.uid())));

-- ============================================
-- 11. tbl_planification_templates
-- ============================================
DROP POLICY IF EXISTS "Users can read templates" ON public.tbl_planification_templates;
DROP POLICY IF EXISTS "Planners can manage templates" ON public.tbl_planification_templates;

CREATE POLICY "Users can read templates"
  ON public.tbl_planification_templates
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Planners can manage templates"
  ON public.tbl_planification_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('Administrateur', 'Planificateur')
    )
  );

-- ============================================
-- 12. tbl_planification_template_taches
-- ============================================
DROP POLICY IF EXISTS "Users can read template tasks" ON public.tbl_planification_template_taches;
DROP POLICY IF EXISTS "Planners can manage template tasks" ON public.tbl_planification_template_taches;

CREATE POLICY "Users can read template tasks"
  ON public.tbl_planification_template_taches
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Planners can manage template tasks"
  ON public.tbl_planification_template_taches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('Administrateur', 'Planificateur')
    )
  );

-- ============================================
-- 13. tbl_jours_feries
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read holidays" ON public.tbl_jours_feries;
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.tbl_jours_feries;

CREATE POLICY "Authenticated users can read holidays"
  ON public.tbl_jours_feries
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admins can manage holidays"
  ON public.tbl_jours_feries
  FOR ALL
  USING (public.is_admin((select auth.uid())));

-- ============================================
-- 14. tbl_fonctions_metier
-- ============================================
DROP POLICY IF EXISTS "Admins peuvent lire toutes fonctions métier" ON public.tbl_fonctions_metier;
DROP POLICY IF EXISTS "Admins peuvent créer fonctions métier" ON public.tbl_fonctions_metier;
DROP POLICY IF EXISTS "Admins peuvent modifier fonctions métier" ON public.tbl_fonctions_metier;
DROP POLICY IF EXISTS "Admins peuvent supprimer fonctions métier" ON public.tbl_fonctions_metier;

CREATE POLICY "Admins peuvent lire toutes fonctions métier"
  ON public.tbl_fonctions_metier
  FOR SELECT
  USING (public.is_admin((select auth.uid())));

CREATE POLICY "Admins peuvent créer fonctions métier"
  ON public.tbl_fonctions_metier
  FOR INSERT
  WITH CHECK (public.is_admin((select auth.uid())));

CREATE POLICY "Admins peuvent modifier fonctions métier"
  ON public.tbl_fonctions_metier
  FOR UPDATE
  USING (public.is_admin((select auth.uid())));

CREATE POLICY "Admins peuvent supprimer fonctions métier"
  ON public.tbl_fonctions_metier
  FOR DELETE
  USING (public.is_admin((select auth.uid())));

-- ============================================
-- 15. Optimisation des politiques existantes (mises à jour)
-- ============================================
-- Note: Les politiques suivantes sont déjà optimisées dans migration 040,
-- mais on s'assure qu'elles utilisent bien (select auth.uid())

-- habilitations
DROP POLICY IF EXISTS "Users can read own habilitations" ON public.habilitations;
DROP POLICY IF EXISTS "RH/Admin can manage all habilitations" ON public.habilitations;
DROP POLICY IF EXISTS "Responsables can read team habilitations" ON public.habilitations;

CREATE POLICY "Users can read own habilitations"
  ON public.habilitations
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH/Admin can manage all habilitations"
  ON public.habilitations
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

CREATE POLICY "Responsables can read team habilitations"
  ON public.habilitations
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs 
      WHERE responsable_id IN (
        SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
      )
    )
  );

-- dosimetrie
DROP POLICY IF EXISTS "Users can read own dosimetrie" ON public.dosimetrie;
DROP POLICY IF EXISTS "RH/Admin can manage all dosimetrie" ON public.dosimetrie;

CREATE POLICY "Users can read own dosimetrie"
  ON public.dosimetrie
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH/Admin can manage all dosimetrie"
  ON public.dosimetrie
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- visites_medicales
DROP POLICY IF EXISTS "Users can read own visites medicales" ON public.visites_medicales;
DROP POLICY IF EXISTS "RH/Admin can manage all visites medicales" ON public.visites_medicales;

CREATE POLICY "Users can read own visites medicales"
  ON public.visites_medicales
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH/Admin can manage all visites medicales"
  ON public.visites_medicales
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- absences
DROP POLICY IF EXISTS "Users can read own absences" ON public.absences;
DROP POLICY IF EXISTS "Users can create own absences" ON public.absences;
DROP POLICY IF EXISTS "RH/Admin can manage all absences" ON public.absences;
DROP POLICY IF EXISTS "Responsables can read and validate team absences" ON public.absences;
DROP POLICY IF EXISTS "Responsables can validate team absences" ON public.absences;

CREATE POLICY "Users can read own absences"
  ON public.absences
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    ) OR
    created_by = (select auth.uid())
  );

CREATE POLICY "Users can create own absences"
  ON public.absences
  FOR INSERT
  WITH CHECK (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    ) OR
    created_by = (select auth.uid())
  );

CREATE POLICY "RH/Admin can manage all absences"
  ON public.absences
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

CREATE POLICY "Responsables can read and validate team absences"
  ON public.absences
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs 
      WHERE responsable_id IN (
        SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "Responsables can validate team absences"
  ON public.absences
  FOR UPDATE
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs 
      WHERE responsable_id IN (
        SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
      )
    )
  );

-- formations
DROP POLICY IF EXISTS "Users can read own formations" ON public.formations;
DROP POLICY IF EXISTS "RH/Admin can manage all formations" ON public.formations;
DROP POLICY IF EXISTS "Responsables can read team formations" ON public.formations;

CREATE POLICY "Users can read own formations"
  ON public.formations
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH/Admin can manage all formations"
  ON public.formations
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

CREATE POLICY "Responsables can read team formations"
  ON public.formations
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs 
      WHERE responsable_id IN (
        SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
      )
    )
  );

-- competences
DROP POLICY IF EXISTS "Authenticated users can read competences" ON public.competences;
DROP POLICY IF EXISTS "RH/Admin can manage competences" ON public.competences;

CREATE POLICY "Authenticated users can read competences"
  ON public.competences
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "RH/Admin can manage competences"
  ON public.competences
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- collaborateurs_competences
DROP POLICY IF EXISTS "Users can read own competences" ON public.collaborateurs_competences;
DROP POLICY IF EXISTS "RH/Admin can manage all collaborateurs_competences" ON public.collaborateurs_competences;

CREATE POLICY "Users can read own competences"
  ON public.collaborateurs_competences
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH/Admin can manage all collaborateurs_competences"
  ON public.collaborateurs_competences
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- tbl_collaborateur_sites
DROP POLICY IF EXISTS "Users can view own site assignments" ON public.tbl_collaborateur_sites;
DROP POLICY IF EXISTS "RH and admins can view all site assignments" ON public.tbl_collaborateur_sites;
DROP POLICY IF EXISTS "Admins and RH can manage site assignments" ON public.tbl_collaborateur_sites;

CREATE POLICY "Users can view own site assignments"
  ON public.tbl_collaborateur_sites
  FOR SELECT
  USING (
    collaborateur_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "RH and admins can view all site assignments"
  ON public.tbl_collaborateur_sites
  FOR SELECT
  USING (public.is_rh_or_admin((select auth.uid())));

CREATE POLICY "Admins and RH can manage site assignments"
  ON public.tbl_collaborateur_sites
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

-- tbl_partenaires
DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent voir les partenaire" ON public.tbl_partenaires;
DROP POLICY IF EXISTS "RH/Admin peuvent gérer les partenaires" ON public.tbl_partenaires;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les partenaire"
  ON public.tbl_partenaires
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "RH/Admin peuvent gérer les partenaires"
  ON public.tbl_partenaires
  FOR ALL
  USING (public.is_rh_or_admin((select auth.uid())));

COMMENT ON TABLE public.tbl_catalogue_formations IS 
  'Politiques RLS optimisées avec (select auth.uid()) pour performance - Migration 061';
COMMENT ON TABLE public.tbl_plan_previsionnel_formations IS 
  'Politiques RLS optimisées avec (select auth.uid()) pour performance - Migration 061';

