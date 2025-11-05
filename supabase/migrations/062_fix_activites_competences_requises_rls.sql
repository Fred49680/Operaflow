-- ============================================
-- Migration 062: Correction RLS pour activites_competences_requises
-- ============================================
-- 
-- Cette migration corrige les politiques RLS de activites_competences_requises
-- pour s'aligner avec les politiques de tbl_planification_activites
-- et permettre l'accès aux utilisateurs qui peuvent lire les activités selon leur rôle
-- 
-- Cette migration est idempotente : elle crée la table si elle n'existe pas
--

-- ============================================================================
-- 1️⃣ CRÉATION DE LA TABLE (si elle n'existe pas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activites_competences_requises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activite_id UUID NOT NULL REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE,
  competence_id UUID NOT NULL REFERENCES public.competences(id) ON DELETE CASCADE,
  niveau_requis VARCHAR(50) DEFAULT 'base', -- 'base', 'intermediaire', 'expert'
  est_obligatoire BOOLEAN DEFAULT true, -- Si false, compétence recommandée mais non obligatoire
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(activite_id, competence_id)
);

COMMENT ON TABLE public.activites_competences_requises IS 'Compétences requises pour réaliser une activité';
COMMENT ON COLUMN public.activites_competences_requises.niveau_requis IS 'Niveau minimum requis : base, intermediaire, expert';
COMMENT ON COLUMN public.activites_competences_requises.est_obligatoire IS 'Si true, la compétence est obligatoire. Si false, recommandée';

-- Créer les index si ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_activites_competences_activite ON public.activites_competences_requises(activite_id);
CREATE INDEX IF NOT EXISTS idx_activites_competences_competence ON public.activites_competences_requises(competence_id);
CREATE INDEX IF NOT EXISTS idx_activites_competences_niveau ON public.activites_competences_requises(niveau_requis);

-- Créer le trigger updated_at si nécessaire
-- Vérifier si la fonction update_tbl_sites_updated_at existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_tbl_sites_updated_at') THEN
    -- Supprimer le trigger s'il existe déjà
    DROP TRIGGER IF EXISTS trigger_activites_competences_updated_at ON public.activites_competences_requises;
    
    -- Créer le trigger
    CREATE TRIGGER trigger_activites_competences_updated_at
      BEFORE UPDATE ON public.activites_competences_requises
      FOR EACH ROW
      EXECUTE FUNCTION update_tbl_sites_updated_at();
  END IF;
END $$;

-- Activer RLS
ALTER TABLE public.activites_competences_requises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2️⃣ CORRECTION DES POLITIQUES RLS
-- ============================================================================

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

