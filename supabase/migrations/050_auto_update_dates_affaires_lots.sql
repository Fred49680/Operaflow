-- Migration: Mise à jour automatique des dates des lots et affaires basées sur les activités de planification
-- Les dates prévues des lots et de l'affaire sont calculées automatiquement à partir des activités

-- 1️⃣ Fonction pour calculer les dates d'un lot basées sur ses activités
CREATE OR REPLACE FUNCTION public.calculer_dates_lot_par_activites(p_lot_id UUID)
RETURNS TABLE (
  date_debut_min DATE,
  date_fin_max DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_debut_min DATE;
  v_date_fin_max DATE;
BEGIN
  -- Récupérer la date de début la plus tôt et la date de fin la plus tard
  -- parmi toutes les activités liées à ce lot
  SELECT 
    MIN(COALESCE(date_debut_prevue::DATE, date_debut_reelle::DATE)),
    MAX(COALESCE(date_fin_prevue::DATE, date_fin_reelle::DATE))
  INTO v_date_debut_min, v_date_fin_max
  FROM public.tbl_planification_activites
  WHERE lot_id = p_lot_id
    AND statut != 'annulee';
  
  -- Si aucune activité trouvée, retourner NULL
  IF v_date_debut_min IS NULL THEN
    v_date_debut_min := NULL;
    v_date_fin_max := NULL;
  END IF;
  
  RETURN QUERY SELECT v_date_debut_min, v_date_fin_max;
END;
$$;

-- 2️⃣ Fonction pour calculer les dates d'une affaire basées sur toutes ses activités
CREATE OR REPLACE FUNCTION public.calculer_dates_affaire_par_activites(p_affaire_id UUID)
RETURNS TABLE (
  date_debut_min DATE,
  date_fin_max DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_debut_min DATE;
  v_date_fin_max DATE;
BEGIN
  -- Récupérer la date de début la plus tôt et la date de fin la plus tard
  -- parmi toutes les activités liées à cette affaire
  SELECT 
    MIN(COALESCE(date_debut_prevue::DATE, date_debut_reelle::DATE)),
    MAX(COALESCE(date_fin_prevue::DATE, date_fin_reelle::DATE))
  INTO v_date_debut_min, v_date_fin_max
  FROM public.tbl_planification_activites
  WHERE affaire_id = p_affaire_id
    AND statut != 'annulee';
  
  -- Si aucune activité trouvée, retourner NULL
  IF v_date_debut_min IS NULL THEN
    v_date_debut_min := NULL;
    v_date_fin_max := NULL;
  END IF;
  
  RETURN QUERY SELECT v_date_debut_min, v_date_fin_max;
END;
$$;

-- 3️⃣ Fonction trigger pour mettre à jour les dates d'un lot après modification d'activité (avec gestion INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.trigger_update_dates_lot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lot_id UUID;
  v_dates RECORD;
  v_should_update BOOLEAN := FALSE;
BEGIN
  -- Récupérer le lot_id de l'activité
  v_lot_id := COALESCE(NEW.lot_id, OLD.lot_id);
  
  -- Si l'activité n'est pas liée à un lot, ne rien faire
  IF v_lot_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier si une mise à jour est nécessaire (pour éviter les boucles infinies)
  IF TG_OP = 'INSERT' THEN
    v_should_update := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_update := (
      (NEW.date_debut_prevue IS DISTINCT FROM OLD.date_debut_prevue)
      OR (NEW.date_fin_prevue IS DISTINCT FROM OLD.date_fin_prevue)
      OR (NEW.date_debut_reelle IS DISTINCT FROM OLD.date_debut_reelle)
      OR (NEW.date_fin_reelle IS DISTINCT FROM OLD.date_fin_reelle)
      OR (NEW.lot_id IS DISTINCT FROM OLD.lot_id)
      OR (NEW.statut IS DISTINCT FROM OLD.statut)
    );
  END IF;
  
  IF NOT v_should_update THEN
    RETURN NEW;
  END IF;
  
  -- Calculer les nouvelles dates du lot
  SELECT * INTO v_dates
  FROM public.calculer_dates_lot_par_activites(v_lot_id);
  
  -- Mettre à jour les dates prévues du lot
  UPDATE public.tbl_affaires_lots
  SET 
    date_debut_previsionnelle = v_dates.date_debut_min,
    date_fin_previsionnelle = v_dates.date_fin_max,
    updated_at = NOW()
  WHERE id = v_lot_id
    AND (
      date_debut_previsionnelle IS DISTINCT FROM v_dates.date_debut_min
      OR date_fin_previsionnelle IS DISTINCT FROM v_dates.date_fin_max
    );
  
  RETURN NEW;
END;
$$;

-- 4️⃣ Fonction trigger pour mettre à jour les dates d'une affaire après modification d'activité (avec gestion INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.trigger_update_dates_affaire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affaire_id UUID;
  v_dates RECORD;
  v_should_update BOOLEAN := FALSE;
BEGIN
  -- Récupérer l'affaire_id de l'activité
  v_affaire_id := COALESCE(NEW.affaire_id, OLD.affaire_id);
  
  -- Si l'activité n'est pas liée à une affaire, ne rien faire
  IF v_affaire_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier si une mise à jour est nécessaire (pour éviter les boucles infinies)
  IF TG_OP = 'INSERT' THEN
    v_should_update := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_update := (
      (NEW.date_debut_prevue IS DISTINCT FROM OLD.date_debut_prevue)
      OR (NEW.date_fin_prevue IS DISTINCT FROM OLD.date_fin_prevue)
      OR (NEW.date_debut_reelle IS DISTINCT FROM OLD.date_debut_reelle)
      OR (NEW.date_fin_reelle IS DISTINCT FROM OLD.date_fin_reelle)
      OR (NEW.affaire_id IS DISTINCT FROM OLD.affaire_id)
      OR (NEW.statut IS DISTINCT FROM OLD.statut)
    );
  END IF;
  
  IF NOT v_should_update THEN
    RETURN NEW;
  END IF;
  
  -- Calculer les nouvelles dates de l'affaire
  SELECT * INTO v_dates
  FROM public.calculer_dates_affaire_par_activites(v_affaire_id);
  
  -- Mettre à jour les dates de début et fin de l'affaire
  UPDATE public.tbl_affaires
  SET 
    date_debut = v_dates.date_debut_min,
    date_fin = v_dates.date_fin_max,
    updated_at = NOW()
  WHERE id = v_affaire_id
    AND (
      date_debut IS DISTINCT FROM v_dates.date_debut_min
      OR date_fin IS DISTINCT FROM v_dates.date_fin_max
    );
  
  RETURN NEW;
END;
$$;

-- 5️⃣ Créer les triggers sur tbl_planification_activites
DROP TRIGGER IF EXISTS trigger_update_dates_lot_on_activite ON public.tbl_planification_activites;
CREATE TRIGGER trigger_update_dates_lot_on_activite
  AFTER INSERT OR UPDATE OF date_debut_prevue, date_fin_prevue, date_debut_reelle, date_fin_reelle, lot_id, statut
  ON public.tbl_planification_activites
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_dates_lot();

DROP TRIGGER IF EXISTS trigger_update_dates_affaire_on_activite ON public.tbl_planification_activites;
CREATE TRIGGER trigger_update_dates_affaire_on_activite
  AFTER INSERT OR UPDATE OF date_debut_prevue, date_fin_prevue, date_debut_reelle, date_fin_reelle, affaire_id, statut
  ON public.tbl_planification_activites
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_dates_affaire();

-- 6️⃣ Fonction pour initialiser les dates des lots et affaires existants
CREATE OR REPLACE FUNCTION public.initialiser_dates_lots_affaires()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lot RECORD;
  v_affaire RECORD;
  v_dates RECORD;
BEGIN
  -- Initialiser les dates de tous les lots
  FOR v_lot IN SELECT id FROM public.tbl_affaires_lots
  LOOP
    SELECT * INTO v_dates
    FROM public.calculer_dates_lot_par_activites(v_lot.id);
    
    UPDATE public.tbl_affaires_lots
    SET 
      date_debut_previsionnelle = v_dates.date_debut_min,
      date_fin_previsionnelle = v_dates.date_fin_max
    WHERE id = v_lot.id;
  END LOOP;
  
  -- Initialiser les dates de toutes les affaires
  FOR v_affaire IN SELECT id FROM public.tbl_affaires
  LOOP
    SELECT * INTO v_dates
    FROM public.calculer_dates_affaire_par_activites(v_affaire.id);
    
    UPDATE public.tbl_affaires
    SET 
      date_debut = v_dates.date_debut_min,
      date_fin = v_dates.date_fin_max
    WHERE id = v_affaire.id;
  END LOOP;
END;
$$;

-- 7️⃣ Exécuter l'initialisation
SELECT public.initialiser_dates_lots_affaires();

-- Commentaires
COMMENT ON FUNCTION public.calculer_dates_lot_par_activites(UUID) IS 'Calcule les dates min/max d''un lot basées sur ses activités de planification';
COMMENT ON FUNCTION public.calculer_dates_affaire_par_activites(UUID) IS 'Calcule les dates min/max d''une affaire basées sur toutes ses activités de planification';
COMMENT ON FUNCTION public.trigger_update_dates_lot() IS 'Met à jour automatiquement les dates prévues d''un lot quand une activité est modifiée';
COMMENT ON FUNCTION public.trigger_update_dates_affaire() IS 'Met à jour automatiquement les dates de début/fin d''une affaire quand une activité est modifiée';

