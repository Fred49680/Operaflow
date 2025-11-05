-- Migration: Ajout des compétences requises pour les activités
-- Permet de définir les compétences nécessaires pour une activité et filtrer les ressources

-- ============================================================================
-- 1️⃣ TABLE: activites_competences_requises
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

CREATE INDEX idx_activites_competences_activite ON public.activites_competences_requises(activite_id);
CREATE INDEX idx_activites_competences_competence ON public.activites_competences_requises(competence_id);
CREATE INDEX idx_activites_competences_niveau ON public.activites_competences_requises(niveau_requis);

-- Trigger updated_at
CREATE TRIGGER trigger_activites_competences_updated_at
  BEFORE UPDATE ON public.activites_competences_requises
  FOR EACH ROW
  EXECUTE FUNCTION update_tbl_sites_updated_at();

-- ============================================================================
-- 2️⃣ ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.activites_competences_requises ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent lire les compétences requises des activités auxquelles ils ont accès
CREATE POLICY "Users can read activites_competences_requises for their activities"
  ON public.activites_competences_requises
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tbl_planification_activites ap
      WHERE ap.id = activites_competences_requises.activite_id
      AND (
        ap.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'rh', 'planificateur', 'responsable_activite')
        )
      )
    )
  );

-- Policy: Seuls les admin, rh, planificateur et responsable d'activité peuvent modifier
CREATE POLICY "Authorized users can manage activites_competences_requises"
  ON public.activites_competences_requises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'rh', 'planificateur', 'responsable_activite')
    )
  );

