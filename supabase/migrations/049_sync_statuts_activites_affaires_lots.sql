-- Migration 049 : Synchronisation automatique des statuts entre activités, affaires et lots
-- Projet : OperaFlow
-- Description : Lorsqu'une activité change de statut, mettre à jour automatiquement le statut de l'affaire et du lot associés
-- Date : 2025-01-11

-- ============================================================================
-- 0️⃣ Ajouter le champ statut à tbl_affaires_lots si nécessaire
-- ============================================================================
-- Vérifier si la colonne existe déjà et l'ajouter si nécessaire
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tbl_affaires_lots' 
        AND column_name = 'statut'
    ) THEN
        ALTER TABLE public.tbl_affaires_lots
        ADD COLUMN statut VARCHAR(50) CHECK (statut IN ('planifie', 'en_cours', 'suspendu', 'termine', 'archive'));
        
        -- Initialiser le statut des lots existants à 'planifie' par défaut
        UPDATE public.tbl_affaires_lots
        SET statut = 'planifie'
        WHERE statut IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lots_statut ON public.tbl_affaires_lots(statut);

COMMENT ON COLUMN public.tbl_affaires_lots.statut IS 
'Statut du lot/jalon calculé automatiquement depuis les statuts de ses activités : planifie, en_cours, suspendu, termine, archive';

-- ============================================================================
-- 1️⃣ Fonction pour calculer le statut d'une affaire basé sur ses activités
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculer_statut_affaire_par_activites(p_affaire_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_statut VARCHAR(50);
    v_count_total INTEGER;
    v_count_terminees INTEGER;
    v_count_lancees INTEGER;
    v_count_suspendues INTEGER;
    v_count_annulees INTEGER;
    v_count_planifiees INTEGER;
BEGIN
    -- Compter les activités par statut
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE statut = 'terminee'),
        COUNT(*) FILTER (WHERE statut = 'lancee'),
        COUNT(*) FILTER (WHERE statut = 'suspendue'),
        COUNT(*) FILTER (WHERE statut = 'annulee'),
        COUNT(*) FILTER (WHERE statut = 'planifiee')
    INTO 
        v_count_total,
        v_count_terminees,
        v_count_lancees,
        v_count_suspendues,
        v_count_annulees,
        v_count_planifiees
    FROM public.tbl_planification_activites
    WHERE affaire_id = p_affaire_id;

    -- Si aucune activité, retourner le statut actuel de l'affaire
    IF v_count_total = 0 THEN
        SELECT statut INTO v_statut FROM public.tbl_affaires WHERE id = p_affaire_id;
        RETURN COALESCE(v_statut, 'cree');
    END IF;

    -- Règles de détermination du statut :
    -- 1. Si toutes les activités sont terminées → 'termine'
    IF v_count_terminees = v_count_total THEN
        RETURN 'termine';
    END IF;

    -- 2. Si au moins une activité est suspendue → 'suspendu'
    IF v_count_suspendues > 0 THEN
        RETURN 'suspendu';
    END IF;

    -- 3. Si au moins une activité est lancée → 'en_cours'
    IF v_count_lancees > 0 THEN
        RETURN 'en_cours';
    END IF;

    -- 4. Si toutes les activités sont planifiées → 'planifie'
    IF v_count_planifiees = v_count_total THEN
        RETURN 'planifie';
    END IF;

    -- 5. Si toutes les activités sont annulées → 'archive' (ou 'termine' selon besoin métier)
    IF v_count_annulees = v_count_total THEN
        RETURN 'archive';
    END IF;

    -- 6. Par défaut, si mixte (quelques activités lancées, d'autres planifiées) → 'en_cours'
    IF v_count_lancees > 0 OR v_count_terminees > 0 THEN
        RETURN 'en_cours';
    END IF;

    -- 7. Sinon, retourner 'planifie'
    RETURN 'planifie';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculer_statut_affaire_par_activites(UUID) IS 
'Calcule le statut d''une affaire en fonction des statuts de ses activités';

-- ============================================================================
-- 2️⃣ Fonction pour calculer le statut d'un lot basé sur ses activités
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculer_statut_lot_par_activites(p_lot_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_statut VARCHAR(50);
    v_count_total INTEGER;
    v_count_terminees INTEGER;
    v_count_lancees INTEGER;
    v_count_suspendues INTEGER;
BEGIN
    -- Compter les activités par statut pour ce lot
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE statut = 'terminee'),
        COUNT(*) FILTER (WHERE statut = 'lancee'),
        COUNT(*) FILTER (WHERE statut = 'suspendue')
    INTO 
        v_count_total,
        v_count_terminees,
        v_count_lancees,
        v_count_suspendues
    FROM public.tbl_planification_activites
    WHERE lot_id = p_lot_id;

    -- Si aucune activité pour ce lot, retourner NULL (pas de statut)
    IF v_count_total = 0 THEN
        RETURN NULL;
    END IF;

    -- Règles similaires à celles de l'affaire
    IF v_count_terminees = v_count_total THEN
        RETURN 'termine';
    END IF;

    IF v_count_suspendues > 0 THEN
        RETURN 'suspendu';
    END IF;

    IF v_count_lancees > 0 THEN
        RETURN 'en_cours';
    END IF;

    RETURN 'planifie';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculer_statut_lot_par_activites(UUID) IS 
'Calcule le statut d''un lot/jalon en fonction des statuts de ses activités';

-- ============================================================================
-- 3️⃣ Fonction trigger principale : Mise à jour des statuts lors changement activité
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_sync_statut_activite()
RETURNS TRIGGER AS $$
DECLARE
    v_affaire_id UUID;
    v_lot_id UUID;
    v_nouveau_statut_affaire VARCHAR(50);
    v_nouveau_statut_lot VARCHAR(50);
BEGIN
    -- Ne traiter que si le statut a changé
    IF TG_OP = 'UPDATE' AND OLD.statut = NEW.statut THEN
        RETURN NEW;
    END IF;

    -- Récupérer l'affaire et le lot associés
    v_affaire_id := NEW.affaire_id;
    v_lot_id := NEW.lot_id;

    -- Calculer et mettre à jour le statut de l'affaire
    v_nouveau_statut_affaire := public.calculer_statut_affaire_par_activites(v_affaire_id);
    
    UPDATE public.tbl_affaires
    SET 
        statut = v_nouveau_statut_affaire,
        updated_at = NOW()
    WHERE id = v_affaire_id
    AND statut != v_nouveau_statut_affaire; -- Éviter les mises à jour inutiles

    -- Calculer et mettre à jour le statut du lot (si un lot est associé)
    IF v_lot_id IS NOT NULL THEN
        v_nouveau_statut_lot := public.calculer_statut_lot_par_activites(v_lot_id);
        
        -- Mettre à jour le statut du lot si calculé
        IF v_nouveau_statut_lot IS NOT NULL THEN
            UPDATE public.tbl_affaires_lots
            SET 
                statut = v_nouveau_statut_lot,
                updated_at = NOW()
            WHERE id = v_lot_id
            AND statut != v_nouveau_statut_lot;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.trigger_sync_statut_activite() IS 
'Déclenche la mise à jour automatique du statut de l''affaire et du lot lorsqu''une activité change de statut';

-- ============================================================================
-- 4️⃣ Créer le trigger sur tbl_planification_activites
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_sync_statut_activite ON public.tbl_planification_activites;

CREATE TRIGGER trigger_sync_statut_activite
    AFTER INSERT OR UPDATE OF statut ON public.tbl_planification_activites
    FOR EACH ROW
    WHEN (NEW.statut IS DISTINCT FROM COALESCE(OLD.statut, ''))
    EXECUTE FUNCTION public.trigger_sync_statut_activite();

-- ============================================================================
-- 5️⃣ Fonction pour initialiser les statuts des affaires existantes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initialiser_statuts_affaires_par_activites()
RETURNS void AS $$
DECLARE
    affaire RECORD;
    nouveau_statut VARCHAR(50);
BEGIN
    -- Parcourir toutes les affaires qui ont des activités
    FOR affaire IN 
        SELECT DISTINCT affaire_id 
        FROM public.tbl_planification_activites
        WHERE affaire_id IS NOT NULL
    LOOP
        nouveau_statut := public.calculer_statut_affaire_par_activites(affaire.affaire_id);
        
        UPDATE public.tbl_affaires
        SET 
            statut = nouveau_statut,
            updated_at = NOW()
        WHERE id = affaire.affaire_id
        AND statut != nouveau_statut;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.initialiser_statuts_affaires_par_activites() IS 
'Initialise les statuts de toutes les affaires en fonction de leurs activités (à exécuter une fois après migration)';

-- Exécuter l'initialisation pour les affaires existantes
SELECT public.initialiser_statuts_affaires_par_activites();

