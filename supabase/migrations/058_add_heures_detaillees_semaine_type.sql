-- Migration: Ajout des champs détaillés d'heures pour la semaine type
-- Permet de configurer heure de début, pause repas, reprise et fin par jour avec calcul auto des heures travaillées

-- ============================================================================
-- 1️⃣ AJOUT DES COLONNES DANS tbl_calendrier_semaine_type
-- ============================================================================
ALTER TABLE public.tbl_calendrier_semaine_type
  ADD COLUMN IF NOT EXISTS heure_debut TIME,
  ADD COLUMN IF NOT EXISTS heure_pause_debut TIME,
  ADD COLUMN IF NOT EXISTS heure_pause_fin TIME,
  ADD COLUMN IF NOT EXISTS heure_fin TIME;

COMMENT ON COLUMN public.tbl_calendrier_semaine_type.heure_debut IS 'Heure de début de la journée de travail (ex: 08:00)';
COMMENT ON COLUMN public.tbl_calendrier_semaine_type.heure_pause_debut IS 'Heure de début de la pause méridienne (ex: 12:00)';
COMMENT ON COLUMN public.tbl_calendrier_semaine_type.heure_pause_fin IS 'Heure de fin de la pause méridienne (ex: 13:00)';
COMMENT ON COLUMN public.tbl_calendrier_semaine_type.heure_fin IS 'Heure de fin de la journée de travail (ex: 17:00)';

-- ============================================================================
-- 2️⃣ FONCTION POUR CALCULER AUTOMATIQUEMENT LES HEURES TRAVAILLÉES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculer_heures_travail_semaine_type()
RETURNS TRIGGER AS $$
DECLARE
  v_heures_travail DECIMAL(4, 2) := 0.0;
  v_heures_matin DECIMAL(4, 2) := 0.0;
  v_heures_aprem DECIMAL(4, 2) := 0.0;
BEGIN
  -- Si les heures détaillées sont renseignées, calculer automatiquement
  IF NEW.heure_debut IS NOT NULL AND NEW.heure_fin IS NOT NULL THEN
    -- Calculer les heures du matin (de début à début de pause)
    IF NEW.heure_pause_debut IS NOT NULL THEN
      v_heures_matin := EXTRACT(EPOCH FROM (NEW.heure_pause_debut - NEW.heure_debut)) / 3600.0;
    ELSE
      -- Pas de pause, heures matin = durée totale
      v_heures_matin := EXTRACT(EPOCH FROM (NEW.heure_fin - NEW.heure_debut)) / 3600.0;
    END IF;
    
    -- Calculer les heures de l'après-midi (de fin de pause à fin)
    IF NEW.heure_pause_fin IS NOT NULL AND NEW.heure_fin IS NOT NULL THEN
      v_heures_aprem := EXTRACT(EPOCH FROM (NEW.heure_fin - NEW.heure_pause_fin)) / 3600.0;
    END IF;
    
    -- Heures totales = matin + après-midi (la pause est automatiquement exclue)
    v_heures_travail := v_heures_matin + v_heures_aprem;
    
    -- Mettre à jour le champ heures_travail
    NEW.heures_travail := ROUND(v_heures_travail, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculer_heures_travail_semaine_type IS 'Calcule automatiquement heures_travail à partir des heures détaillées (début, pause, reprise, fin)';

-- ============================================================================
-- 3️⃣ TRIGGER POUR CALCUL AUTOMATIQUE
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_calculer_heures_travail_semaine_type ON public.tbl_calendrier_semaine_type;
CREATE TRIGGER trigger_calculer_heures_travail_semaine_type
  BEFORE INSERT OR UPDATE ON public.tbl_calendrier_semaine_type
  FOR EACH ROW
  WHEN (
    NEW.heure_debut IS NOT NULL OR 
    NEW.heure_fin IS NOT NULL OR 
    NEW.heure_pause_debut IS NOT NULL OR 
    NEW.heure_pause_fin IS NOT NULL
  )
  EXECUTE FUNCTION public.calculer_heures_travail_semaine_type();

-- ============================================================================
-- 4️⃣ MISE À JOUR DES VALEURS EXISTANTES (si heures_travail > 0 et heures détaillées non renseignées)
-- ============================================================================
-- Mettre des valeurs par défaut pour les jours ouvrés existants
UPDATE public.tbl_calendrier_semaine_type
SET 
  heure_debut = '08:00'::TIME,
  heure_pause_debut = '12:00'::TIME,
  heure_pause_fin = '13:00'::TIME,
  heure_fin = '16:00'::TIME
WHERE 
  type_jour = 'ouvre' 
  AND heures_travail > 0
  AND heure_debut IS NULL;

