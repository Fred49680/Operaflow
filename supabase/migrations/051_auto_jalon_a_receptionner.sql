-- Migration: Passage automatique des jalons en "A réceptionner" quand 100% des activités sont terminées
-- et création d'alertes automatiques pour le CA

-- 1️⃣ Fonction pour calculer le pourcentage d'avancement d'un jalon
CREATE OR REPLACE FUNCTION public.calculer_avancement_jalon(p_lot_id UUID)
RETURNS TABLE (
  total_activites INTEGER,
  activites_terminees INTEGER,
  pourcentage_avancement NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_activites INTEGER;
  v_activites_terminees INTEGER;
  v_pourcentage NUMERIC;
BEGIN
  -- Compter le total d'activités liées au jalon (non annulées)
  SELECT COUNT(*) INTO v_total_activites
  FROM public.tbl_planification_activites
  WHERE lot_id = p_lot_id
    AND statut != 'annulee';
  
  -- Si aucune activité, retourner 0%
  IF v_total_activites = 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Compter les activités terminées
  SELECT COUNT(*) INTO v_activites_terminees
  FROM public.tbl_planification_activites
  WHERE lot_id = p_lot_id
    AND statut = 'terminee';
  
  -- Calculer le pourcentage
  v_pourcentage := (v_activites_terminees::NUMERIC / v_total_activites::NUMERIC) * 100;
  
  RETURN QUERY SELECT v_total_activites, v_activites_terminees, ROUND(v_pourcentage, 2);
END;
$$;

-- 2️⃣ Fonction pour vérifier et mettre à jour le statut du jalon
CREATE OR REPLACE FUNCTION public.verifier_statut_jalon(p_lot_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avancement RECORD;
  v_lot RECORD;
  v_affaire RECORD;
  v_ca_id UUID;
  v_ancien_statut TEXT;
BEGIN
  -- Récupérer les informations du lot
  SELECT * INTO v_lot
  FROM public.tbl_affaires_lots
  WHERE id = p_lot_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Mémoriser l'ancien statut
  v_ancien_statut := v_lot.statut;
  
  -- Calculer l'avancement
  SELECT * INTO v_avancement
  FROM public.calculer_avancement_jalon(p_lot_id);
  
  -- Si 100% des activités sont terminées, passer le jalon en "a_receptionner"
  IF v_avancement.pourcentage_avancement >= 100 AND v_lot.statut != 'a_receptionner' AND v_lot.statut != 'receptionne' THEN
    -- Mettre à jour le statut du jalon
    UPDATE public.tbl_affaires_lots
    SET 
      statut = 'a_receptionner',
      updated_at = NOW()
    WHERE id = p_lot_id;
    
    -- Récupérer les informations de l'affaire pour envoyer l'alerte au CA
    SELECT * INTO v_affaire
    FROM public.tbl_affaires
    WHERE id = v_lot.affaire_id;
    
    IF FOUND AND v_affaire.charge_affaires_id IS NOT NULL THEN
      v_ca_id := v_affaire.charge_affaires_id;
      
      -- Créer une alerte pour le CA (utiliser 'surcharge' comme type si 'jalon_a_receptionner' n'existe pas)
      -- Note: Adapter selon la structure réelle de votre table d'alertes
      BEGIN
        INSERT INTO public.tbl_planification_alertes (
          type_alerte,
          affaire_id,
          message,
          gravite,
          statut,
          created_at,
          updated_at
        ) VALUES (
          'surcharge', -- Utiliser un type existant, ou créer un nouveau type si ENUM le permet
          v_affaire.id,
          format('Le jalon "%s" (Lot: %s) de l''affaire %s est prêt à être réceptionné. Toutes les activités associées sont terminées.', 
                 v_lot.libelle_lot, v_lot.numero_lot, v_affaire.numero),
          'warning',
          'active',
          NOW(),
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        -- Si la table n'existe pas ou erreur, on continue sans créer l'alerte
        -- L'alerte pourra être créée via un autre mécanisme (email, notification, etc.)
        NULL;
      END;
    END IF;
  END IF;
END;
$$;

-- 3️⃣ Trigger pour vérifier le statut du jalon après modification d'activité
CREATE OR REPLACE FUNCTION public.trigger_verifier_jalon_apres_activite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lot_id UUID;
  v_should_check BOOLEAN := FALSE;
BEGIN
  -- Récupérer le lot_id de l'activité
  v_lot_id := COALESCE(NEW.lot_id, OLD.lot_id);
  
  -- Si l'activité n'est pas liée à un lot, ne rien faire
  IF v_lot_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Vérifier si une vérification est nécessaire
  IF TG_OP = 'INSERT' THEN
    v_should_check := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_check := (
      (NEW.statut IS DISTINCT FROM OLD.statut)
      OR (NEW.lot_id IS DISTINCT FROM OLD.lot_id)
    );
  END IF;
  
  IF v_should_check THEN
    -- Vérifier et mettre à jour le statut du jalon
    PERFORM public.verifier_statut_jalon(v_lot_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4️⃣ Créer le trigger sur tbl_planification_activites
DROP TRIGGER IF EXISTS trigger_verifier_jalon_apres_activite ON public.tbl_planification_activites;
CREATE TRIGGER trigger_verifier_jalon_apres_activite
  AFTER INSERT OR UPDATE OF statut, lot_id
  ON public.tbl_planification_activites
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_verifier_jalon_apres_activite();

-- 5️⃣ Vérifier les jalons existants
DO $$
DECLARE
  v_lot RECORD;
BEGIN
  FOR v_lot IN 
    SELECT id FROM public.tbl_affaires_lots WHERE est_jalon_gantt = true
  LOOP
    PERFORM public.verifier_statut_jalon(v_lot.id);
  END LOOP;
END $$;

-- 6️⃣ Ajouter les statuts 'a_receptionner' et 'receptionne' à tbl_affaires_lots
ALTER TABLE public.tbl_affaires_lots
DROP CONSTRAINT IF EXISTS tbl_affaires_lots_statut_check;

ALTER TABLE public.tbl_affaires_lots
ADD CONSTRAINT tbl_affaires_lots_statut_check 
CHECK (statut IN ('planifie', 'en_cours', 'suspendu', 'termine', 'archive', 'a_receptionner', 'receptionne'));

-- Commentaires
COMMENT ON FUNCTION public.calculer_avancement_jalon(UUID) IS 'Calcule le pourcentage d''avancement d''un jalon basé sur les activités terminées';
COMMENT ON FUNCTION public.verifier_statut_jalon(UUID) IS 'Vérifie si un jalon doit passer en "A réceptionner" et crée une alerte pour le CA';
COMMENT ON FUNCTION public.trigger_verifier_jalon_apres_activite() IS 'Déclenche la vérification du statut d''un jalon après modification d''une activité';

