-- Migration: Ajout du champ calendrier_id à tbl_planification_activites
-- Permet de lier une activité à un calendrier pour le calcul automatique des heures prévues

-- ============================================================================
-- 1️⃣ Ajout de la colonne calendrier_id
-- ============================================================================
ALTER TABLE public.tbl_planification_activites
ADD COLUMN IF NOT EXISTS calendrier_id UUID REFERENCES public.tbl_calendriers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activites_calendrier_id ON public.tbl_planification_activites(calendrier_id);

COMMENT ON COLUMN public.tbl_planification_activites.calendrier_id IS 'Calendrier utilisé pour le calcul automatique des heures prévues (exclut jours fériés)';

