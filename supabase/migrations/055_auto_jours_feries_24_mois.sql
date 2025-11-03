-- Migration: Génération automatique des jours fériés (année courante + N+1)
-- Supprime la fonction de plage et met à jour le trigger pour générer automatiquement

-- ============================================================================
-- 1️⃣ Suppression de l'ancienne fonction de plage (non utilisée)
-- ============================================================================
DROP FUNCTION IF EXISTS public.generer_jours_feries_fr_plage(UUID, INTEGER, INTEGER);

-- ============================================================================
-- 2️⃣ Fonction pour synchroniser les jours fériés (vérifie si N+1 est à jour)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.synchroniser_jours_feries_24_mois(
  p_calendrier_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_annee_courante INTEGER;
  v_annee_suivante INTEGER;
  v_annee_max_existante INTEGER;
  v_total INTEGER := 0;
BEGIN
  -- Récupérer l'année courante
  v_annee_courante := EXTRACT(YEAR FROM CURRENT_DATE);
  v_annee_suivante := v_annee_courante + 1;
  
  -- Vérifier si l'année suivante existe déjà
  SELECT MAX(EXTRACT(YEAR FROM date_jour))::INTEGER INTO v_annee_max_existante
  FROM public.tbl_calendrier_jours
  WHERE calendrier_id = p_calendrier_id
    AND est_recurrent = true
    AND type_jour = 'chome';
  
  -- Si l'année suivante n'existe pas ou est inférieure à l'année courante + 1, générer
  IF v_annee_max_existante IS NULL OR v_annee_max_existante < v_annee_suivante THEN
    -- Générer pour l'année courante si nécessaire
    IF v_annee_max_existante IS NULL OR v_annee_max_existante < v_annee_courante THEN
      v_total := v_total + public.generer_jours_feries_fr(p_calendrier_id, v_annee_courante);
    END IF;
    
    -- Générer pour l'année suivante
    v_total := v_total + public.generer_jours_feries_fr(p_calendrier_id, v_annee_suivante);
  END IF;
  
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.synchroniser_jours_feries_24_mois IS 'Synchronise les jours fériés pour maintenir une fenêtre de 24 mois (année courante + N+1)';

