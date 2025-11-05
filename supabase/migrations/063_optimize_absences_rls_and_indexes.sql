-- ============================================
-- Migration 063: Optimisation RLS et index pour module absences
-- ============================================
-- 
-- Cette migration optimise les politiques RLS des tables du module absences
-- en remplaçant auth.uid() par (select auth.uid()) pour éviter la réévaluation par ligne
-- et ajoute les index manquants sur les clés étrangères
--

-- ============================================================================
-- 1️⃣ INDEX SUR CLÉS ÉTRANGÈRES MANQUANTES
-- ============================================================================

-- Table: catalogue_absences
CREATE INDEX IF NOT EXISTS idx_catalogue_absences_created_by ON public.catalogue_absences(created_by);
CREATE INDEX IF NOT EXISTS idx_catalogue_absences_updated_by ON public.catalogue_absences(updated_by);

-- Table: historique_validations_absences
-- Les index principaux sont déjà créés dans la migration 026, mais vérifions les FK
CREATE INDEX IF NOT EXISTS idx_historique_validations_valide_par_fk ON public.historique_validations_absences(valide_par);

-- Table: absences (colonnes ajoutées dans migration 026)
CREATE INDEX IF NOT EXISTS idx_absences_catalogue_absence_id ON public.absences(catalogue_absence_id);
CREATE INDEX IF NOT EXISTS idx_absences_valide_par_n1 ON public.absences(valide_par_n1);
CREATE INDEX IF NOT EXISTS idx_absences_valide_par_rh ON public.absences(valide_par_rh);

-- ============================================================================
-- 2️⃣ OPTIMISATION POLITIQUES RLS : catalogue_absences
-- ============================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "RH peut gérer catalogue" ON public.catalogue_absences;

-- Nouvelle politique optimisée
CREATE POLICY "RH peut gérer catalogue"
  ON public.catalogue_absences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      INNER JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND (r.name = 'Administrateur' OR r.name LIKE '%RH%')
    )
  );

-- ============================================================================
-- 3️⃣ OPTIMISATION POLITIQUES RLS : historique_validations_absences
-- ============================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Collaborateur voit son historique" ON public.historique_validations_absences;
DROP POLICY IF EXISTS "RH voit tous historiques" ON public.historique_validations_absences;

-- Nouvelle politique optimisée : Collaborateur peut voir l'historique de ses absences
CREATE POLICY "Collaborateur voit son historique"
  ON public.historique_validations_absences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.absences a
      INNER JOIN public.collaborateurs c ON a.collaborateur_id = c.id
      WHERE a.id = historique_validations_absences.absence_id
      AND c.user_id = (select auth.uid())
    )
  );

-- Nouvelle politique optimisée : RH/Admin et responsables peuvent voir tous les historiques
CREATE POLICY "RH voit tous historiques"
  ON public.historique_validations_absences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      INNER JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND (r.name = 'Administrateur' OR r.name LIKE '%RH%')
    )
    OR EXISTS (
      SELECT 1 FROM public.absences a
      INNER JOIN public.collaborateurs c ON a.collaborateur_id = c.id
      WHERE a.id = historique_validations_absences.absence_id
      AND (
        c.responsable_id IN (
          SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
        ) OR c.responsable_activite_id IN (
          SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
        )
      )
    )
  );

-- ============================================================================
-- 4️⃣ COMMENTAIRES
-- ============================================================================

COMMENT ON POLICY "RH peut gérer catalogue" ON public.catalogue_absences IS 
  'Politique RLS optimisée (select auth.uid()) pour performance - gestion catalogue absences';

COMMENT ON POLICY "Collaborateur voit son historique" ON public.historique_validations_absences IS 
  'Politique RLS optimisée (select auth.uid()) pour performance - historique validations absences';

COMMENT ON POLICY "RH voit tous historiques" ON public.historique_validations_absences IS 
  'Politique RLS optimisée (select auth.uid()) pour performance - historique validations absences';

