-- Migration 046 : Support dépendances multiples et affaires persistantes dans Gantt
-- Projet : OperaFlow
-- Description : Ajouter table pour dépendances multiples et permettre affaires planifiées de rester dans Gantt
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ TABLE: tbl_planification_dependances (Dépendances multiples)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_dependances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Activité qui a la dépendance (successeur)
    activite_id UUID NOT NULL REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE,
    
    -- Activité dont on dépend (prédécesseur)
    activite_precedente_id UUID NOT NULL REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE,
    
    -- Type de dépendance
    type_dependance VARCHAR(10) NOT NULL CHECK (type_dependance IN ('FS', 'SS', 'FF', 'SF')),
    -- FS = Finish-to-Start (fin prédecesseur -> début successeur)
    -- SS = Start-to-Start (début -> début)
    -- FF = Finish-to-Finish (fin -> fin)
    -- SF = Start-to-Finish (début -> fin)
    
    -- Délai optionnel (en jours)
    delai_jours INTEGER DEFAULT 0, -- Délai entre la fin du prédecesseur et le début du successeur
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Contrainte : une activité ne peut pas dépendre d'elle-même
    CONSTRAINT chk_no_self_dependency CHECK (activite_id != activite_precedente_id),
    -- Contrainte : pas de doublons
    CONSTRAINT uq_dependance_unique UNIQUE (activite_id, activite_precedente_id)
);

CREATE INDEX IF NOT EXISTS idx_planif_dependances_activite_id ON public.tbl_planification_dependances(activite_id);
CREATE INDEX IF NOT EXISTS idx_planif_dependances_precedente_id ON public.tbl_planification_dependances(activite_precedente_id);
CREATE INDEX IF NOT EXISTS idx_planif_dependances_type ON public.tbl_planification_dependances(type_dependance);

-- ============================================================================
-- 2️⃣ Fonction pour calculer dates avec dépendances multiples
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_calculer_dates_dependances_multiples()
RETURNS TRIGGER AS $$
DECLARE
    dependance RECORD;
    date_calculee TIMESTAMPTZ;
    duree_activite INTERVAL;
    max_date_debut TIMESTAMPTZ;
    max_date_fin TIMESTAMPTZ;
BEGIN
    -- Si l'activité a des dépendances, calculer les dates
    SELECT 
        MAX(CASE 
            WHEN d.type_dependance = 'FS' THEN 
                (SELECT date_fin_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) + 
                (d.delai_jours || ' days')::INTERVAL + INTERVAL '1 day'
            WHEN d.type_dependance = 'SS' THEN 
                (SELECT date_debut_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL
            WHEN d.type_dependance = 'FF' THEN 
                (SELECT date_fin_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL -
                (NEW.date_fin_prevue - NEW.date_debut_prevue)
            WHEN d.type_dependance = 'SF' THEN 
                (SELECT date_debut_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL -
                (NEW.date_fin_prevue - NEW.date_debut_prevue)
        END) as max_date_debut,
        MAX(CASE 
            WHEN d.type_dependance = 'FF' THEN 
                (SELECT date_fin_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL
            WHEN d.type_dependance = 'SF' THEN 
                (SELECT date_debut_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL
        END) as max_date_fin
    INTO max_date_debut, max_date_fin
    FROM public.tbl_planification_dependances d
    WHERE d.activite_id = NEW.id;
    
    -- Si on a des dépendances qui calculent la date de début
    IF max_date_debut IS NOT NULL THEN
        duree_activite := COALESCE(NEW.date_fin_prevue - NEW.date_debut_prevue, INTERVAL '1 day');
        NEW.date_debut_prevue := max_date_debut;
        NEW.date_fin_prevue := NEW.date_debut_prevue + duree_activite;
    END IF;
    
    -- Si on a des dépendances FF ou SF qui calculent la date de fin
    IF max_date_fin IS NOT NULL THEN
        duree_activite := COALESCE(NEW.date_fin_prevue - NEW.date_debut_prevue, INTERVAL '1 day');
        NEW.date_fin_prevue := max_date_fin;
        NEW.date_debut_prevue := NEW.date_fin_prevue - duree_activite;
        
        -- Ajuster si la date de début calculée est après la date de fin
        IF NEW.date_debut_prevue > NEW.date_fin_prevue THEN
            NEW.date_debut_prevue := NEW.date_fin_prevue - duree_activite;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer les dates quand une dépendance est ajoutée/modifiée/supprimée
CREATE OR REPLACE FUNCTION recalculer_dates_activite_apres_dependance()
RETURNS TRIGGER AS $$
DECLARE
    activite_id_to_update UUID;
    max_date_debut TIMESTAMPTZ;
    max_date_fin TIMESTAMPTZ;
    duree_activite INTERVAL;
BEGIN
    activite_id_to_update := COALESCE(NEW.activite_id, OLD.activite_id);
    
    IF activite_id_to_update IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculer les dates selon toutes les dépendances
    SELECT 
        MAX(CASE 
            WHEN d.type_dependance = 'FS' THEN 
                (SELECT date_fin_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) + 
                (d.delai_jours || ' days')::INTERVAL + INTERVAL '1 day'
            WHEN d.type_dependance = 'SS' THEN 
                (SELECT date_debut_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL
        END) as max_date_debut,
        MAX(CASE 
            WHEN d.type_dependance = 'FF' THEN 
                (SELECT date_fin_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL
            WHEN d.type_dependance = 'SF' THEN 
                (SELECT date_debut_prevue FROM public.tbl_planification_activites WHERE id = d.activite_precedente_id) +
                (d.delai_jours || ' days')::INTERVAL
        END) as max_date_fin
    INTO max_date_debut, max_date_fin
    FROM public.tbl_planification_dependances d
    WHERE d.activite_id = activite_id_to_update;
    
    -- Recalculer les dates de l'activité
    IF max_date_debut IS NOT NULL OR max_date_fin IS NOT NULL THEN
        -- Récupérer la durée actuelle
        SELECT (date_fin_prevue - date_debut_prevue)
        INTO duree_activite
        FROM public.tbl_planification_activites
        WHERE id = activite_id_to_update;
        
        IF duree_activite IS NULL THEN
            duree_activite := INTERVAL '1 day';
        END IF;
        
        IF max_date_debut IS NOT NULL THEN
            UPDATE public.tbl_planification_activites
            SET 
                date_debut_prevue = max_date_debut,
                date_fin_prevue = max_date_debut + duree_activite,
                updated_at = NOW()
            WHERE id = activite_id_to_update;
        ELSIF max_date_fin IS NOT NULL THEN
            UPDATE public.tbl_planification_activites
            SET 
                date_fin_prevue = max_date_fin,
                date_debut_prevue = max_date_fin - duree_activite,
                updated_at = NOW()
            WHERE id = activite_id_to_update;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_dates_apres_dependance ON public.tbl_planification_dependances;
CREATE TRIGGER trigger_recalc_dates_apres_dependance
    AFTER INSERT OR UPDATE OR DELETE ON public.tbl_planification_dependances
    FOR EACH ROW
    EXECUTE FUNCTION recalculer_dates_activite_apres_dependance();

-- ============================================================================
-- 3️⃣ Vue pour afficher toutes les affaires avec activités dans le Gantt
-- ============================================================================
CREATE OR REPLACE VIEW public.v_affaires_gantt AS
SELECT 
    a.id as affaire_id,
    a.numero,
    a.libelle,
    a.statut as statut_affaire,
    a.site_id,
    a.date_debut,
    a.date_fin,
    COUNT(DISTINCT act.id) as nombre_activites,
    MIN(act.date_debut_prevue) as date_debut_min,
    MAX(act.date_fin_prevue) as date_fin_max,
    SUM(act.heures_prevues) as total_heures_prevues,
    AVG(act.pourcentage_avancement) as avancement_moyen
FROM public.tbl_affaires a
LEFT JOIN public.tbl_planification_activites act ON act.affaire_id = a.id
WHERE a.statut IN ('planifie', 'en_cours', 'suspendu', 'en_cloture')
GROUP BY a.id, a.numero, a.libelle, a.statut, a.site_id, a.date_debut, a.date_fin;

-- ============================================================================
-- 4️⃣ RLS pour la table de dépendances
-- ============================================================================
ALTER TABLE public.tbl_planification_dependances ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can read dependencies based on activity access" ON public.tbl_planification_dependances;
DROP POLICY IF EXISTS "Users can manage dependencies based on role" ON public.tbl_planification_dependances;

CREATE POLICY "Users can read dependencies based on activity access"
    ON public.tbl_planification_dependances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tbl_planification_activites act
            WHERE act.id = tbl_planification_dependances.activite_id
            OR act.id = tbl_planification_dependances.activite_precedente_id
        )
    );

CREATE POLICY "Users can manage dependencies based on role"
    ON public.tbl_planification_dependances FOR ALL
    USING (
        (select auth.role()) = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
                AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

COMMENT ON TABLE public.tbl_planification_dependances IS 
    'Table de liaison pour gérer plusieurs dépendances entre activités (remplace activite_precedente_id unique)';

COMMENT ON VIEW public.v_affaires_gantt IS 
    'Vue agrégée des affaires avec leurs activités pour affichage dans le Gantt';

