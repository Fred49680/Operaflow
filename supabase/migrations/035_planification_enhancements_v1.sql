-- Migration 035 : Améliorations Planification v1
-- Projet : OperaFlow
-- Description : Hiérarchie tâches, dépendances, jours ouvrés, templates
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ AJOUT CHAMPS HIÉRARCHIE ET DURÉE JOURS OUVÉS
-- ============================================================================

-- Ajouter parent_id pour la hiérarchie
ALTER TABLE public.tbl_planification_activites 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE;

-- Ajouter numéro hiérarchique (ex: "1.1.1.1")
ALTER TABLE public.tbl_planification_activites 
ADD COLUMN IF NOT EXISTS numero_hierarchique VARCHAR(50);

-- Ajouter niveau de profondeur (0 = racine, 1 = sous-tâche de niveau 1, etc.)
ALTER TABLE public.tbl_planification_activites 
ADD COLUMN IF NOT EXISTS niveau_hierarchie INTEGER DEFAULT 0;

-- Ajouter ordre d'affichage dans le niveau
ALTER TABLE public.tbl_planification_activites 
ADD COLUMN IF NOT EXISTS ordre_affichage INTEGER DEFAULT 0;

-- Ajouter durée en jours ouvrés
ALTER TABLE public.tbl_planification_activites 
ADD COLUMN IF NOT EXISTS duree_jours_ouvres INTEGER;

-- Ajouter flag pour calcul auto de date fin depuis jours ouvrés
ALTER TABLE public.tbl_planification_activites 
ADD COLUMN IF NOT EXISTS calcul_auto_date_fin BOOLEAN DEFAULT false;

-- Améliorer le champ type_dependance (déjà existe, mais on ajoute des commentaires)
COMMENT ON COLUMN public.tbl_planification_activites.type_dependance IS 
'FS=Finish-to-Start (fin prédecesseur -> début successeur), SS=Start-to-Start (début -> début), FF=Finish-to-Finish (fin -> fin), SF=Start-to-Finish (début -> fin)';

-- Index pour la hiérarchie
CREATE INDEX IF NOT EXISTS idx_planif_activites_parent_id ON public.tbl_planification_activites(parent_id);
CREATE INDEX IF NOT EXISTS idx_planif_activites_niveau ON public.tbl_planification_activites(niveau_hierarchie);
CREATE INDEX IF NOT EXISTS idx_planif_activites_numero_hierarchique ON public.tbl_planification_activites(numero_hierarchique);

-- ============================================================================
-- 2️⃣ TABLE: tbl_planification_templates (Templates de tâches)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    nom_template VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Catégorie
    categorie VARCHAR(50), -- Ex: "Chantier standard", "Maintenance", "Rénovation"
    
    -- Métadonnées
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 3️⃣ TABLE: tbl_planification_template_taches (Tâches dans un template)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_template_taches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Liaison
    template_id UUID NOT NULL REFERENCES public.tbl_planification_templates(id) ON DELETE CASCADE,
    
    -- Hiérarchie dans le template
    parent_template_tache_id UUID REFERENCES public.tbl_planification_template_taches(id) ON DELETE CASCADE,
    numero_hierarchique VARCHAR(50),
    niveau_hierarchie INTEGER DEFAULT 0,
    ordre_affichage INTEGER DEFAULT 0,
    
    -- Données de la tâche
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    duree_jours_ouvres INTEGER, -- Durée en jours ouvrés
    type_horaire VARCHAR(20) DEFAULT 'jour' CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie')),
    heures_prevues DECIMAL(8, 2) DEFAULT 0,
    
    -- Dépendances (référence à une autre tâche du template)
    tache_precedente_id UUID REFERENCES public.tbl_planification_template_taches(id) ON DELETE SET NULL,
    type_dependance VARCHAR(10) CHECK (type_dependance IN ('FS', 'SS', 'FF', 'SF')),
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_taches_template_id ON public.tbl_planification_template_taches(template_id);
CREATE INDEX IF NOT EXISTS idx_template_taches_parent_id ON public.tbl_planification_template_taches(parent_template_tache_id);

-- ============================================================================
-- 4️⃣ TABLE: tbl_jours_feries (Jours fériés pour calcul jours ouvrés)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_jours_feries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Date du jour férié
    date_ferie DATE NOT NULL UNIQUE,
    
    -- Libellé
    libelle VARCHAR(255) NOT NULL, -- Ex: "Jour de l'An", "Fête du Travail"
    
    -- Type
    type_ferie VARCHAR(50) DEFAULT 'national', -- 'national', 'regional', 'site'
    
    -- Si régional/site, spécifier le site_id ou région
    site_id UUID REFERENCES public.tbl_sites(site_id) ON DELETE CASCADE,
    
    -- Répétition annuelle
    est_recurrent BOOLEAN DEFAULT true, -- Si true, appliqué chaque année
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_jours_feries_date ON public.tbl_jours_feries(date_ferie);
CREATE INDEX IF NOT EXISTS idx_jours_feries_site_id ON public.tbl_jours_feries(site_id);

-- Insérer les jours fériés nationaux français par défaut pour l'année courante et suivante
INSERT INTO public.tbl_jours_feries (date_ferie, libelle, type_ferie, est_recurrent)
VALUES 
    (DATE '2025-01-01', 'Jour de l''An', 'national', true),
    (DATE '2025-04-21', 'Lundi de Pâques', 'national', true),
    (DATE '2025-05-01', 'Fête du Travail', 'national', true),
    (DATE '2025-05-08', 'Fête de la Victoire', 'national', true),
    (DATE '2025-05-29', 'Ascension', 'national', true),
    (DATE '2025-06-09', 'Lundi de Pentecôte', 'national', true),
    (DATE '2025-07-14', 'Fête Nationale', 'national', true),
    (DATE '2025-08-15', 'Assomption', 'national', true),
    (DATE '2025-11-01', 'Toussaint', 'national', true),
    (DATE '2025-11-11', 'Armistice', 'national', true),
    (DATE '2025-12-25', 'Noël', 'national', true)
ON CONFLICT (date_ferie) DO NOTHING;

-- ============================================================================
-- 5️⃣ FONCTION: Calculer date fin depuis jours ouvrés
-- ============================================================================
CREATE OR REPLACE FUNCTION calculer_date_fin_jours_ouvres(
    date_debut_activite DATE,
    duree_jours_ouvres INTEGER,
    site_id_activite UUID DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    date_courante DATE;
    jours_ajoutes INTEGER := 0;
    jours_ouvres_comptes INTEGER := 0;
    est_jour_ouvre BOOLEAN;
BEGIN
    date_courante := date_debut_activite;
    
    -- Ajouter les jours jusqu'à atteindre la durée en jours ouvrés
    WHILE jours_ouvres_comptes < duree_jours_ouvres LOOP
        -- Vérifier si c'est un jour ouvré (pas samedi, pas dimanche, pas férié)
        est_jour_ouvre := EXTRACT(DOW FROM date_courante) NOT IN (0, 6); -- 0 = dimanche, 6 = samedi
        
        -- Vérifier si c'est un jour férié
        IF est_jour_ouvre THEN
            IF EXISTS (
                SELECT 1 FROM public.tbl_jours_feries jf
                WHERE jf.date_ferie = date_courante
                AND (jf.type_ferie = 'national' OR (jf.type_ferie = 'site' AND jf.site_id = site_id_activite))
            ) THEN
                est_jour_ouvre := false;
            END IF;
        END IF;
        
        -- Si jour ouvré, compter
        IF est_jour_ouvre THEN
            jours_ouvres_comptes := jours_ouvres_comptes + 1;
        END IF;
        
        -- Passer au jour suivant (sauf si on a atteint la durée)
        IF jours_ouvres_comptes < duree_jours_ouvres THEN
            date_courante := date_courante + INTERVAL '1 day';
        END IF;
    END LOOP;
    
    RETURN date_courante;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6️⃣ FONCTION: Générer numéro hiérarchique automatique
-- ============================================================================
CREATE OR REPLACE FUNCTION generer_numero_hierarchique(
    affaire_id_param UUID,
    activite_parent_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50) AS $$
DECLARE
    numero_parent VARCHAR(50);
    dernier_numero VARCHAR(50);
    niveau_actuel INTEGER;
    prochain_numero INTEGER;
BEGIN
    -- Si pas de parent, c'est une tâche de niveau 1
    IF activite_parent_id IS NULL THEN
        -- Trouver le dernier numéro de niveau 1 pour cette affaire
        SELECT COALESCE(MAX(CAST(SPLIT_PART(numero_hierarchique, '.', 1) AS INTEGER)), 0) + 1
        INTO prochain_numero
        FROM public.tbl_planification_activites
        WHERE affaire_id = affaire_id_param AND parent_id IS NULL;
        
        RETURN prochain_numero::VARCHAR;
    ELSE
        -- Récupérer le numéro du parent
        SELECT numero_hierarchique, niveau_hierarchie
        INTO numero_parent, niveau_actuel
        FROM public.tbl_planification_activites
        WHERE id = activite_parent_id;
        
        -- Trouver le dernier sous-numéro pour ce parent
        SELECT COALESCE(MAX(CAST(SPLIT_PART(numero_hierarchique, '.', (niveau_actuel + 2)) AS INTEGER)), 0) + 1
        INTO prochain_numero
        FROM public.tbl_planification_activites
        WHERE parent_id = activite_parent_id;
        
        RETURN numero_parent || '.' || prochain_numero::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7️⃣ TRIGGER: Calculer date fin depuis jours ouvrés
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_calculer_date_fin_jours_ouvres()
RETURNS TRIGGER AS $$
BEGIN
    -- Si calcul_auto_date_fin est true et duree_jours_ouvres est renseigné
    IF NEW.calcul_auto_date_fin = true AND NEW.duree_jours_ouvres IS NOT NULL AND NEW.duree_jours_ouvres > 0 THEN
        -- Convertir date_debut_prevue en DATE si c'est un TIMESTAMPTZ
        NEW.date_fin_prevue := calculer_date_fin_jours_ouvres(
            NEW.date_debut_prevue::DATE,
            NEW.duree_jours_ouvres,
            NEW.site_id
        )::TIMESTAMPTZ + (NEW.date_debut_prevue::TIME);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calc_date_fin_jours_ouvres ON public.tbl_planification_activites;
CREATE TRIGGER trigger_calc_date_fin_jours_ouvres
    BEFORE INSERT OR UPDATE ON public.tbl_planification_activites
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculer_date_fin_jours_ouvres();

-- ============================================================================
-- 8️⃣ TRIGGER: Générer numéro hiérarchique automatique
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_generer_numero_hierarchique()
RETURNS TRIGGER AS $$
BEGIN
    -- Si numéro hiérarchique n'est pas fourni, le générer
    IF NEW.numero_hierarchique IS NULL OR NEW.numero_hierarchique = '' THEN
        NEW.numero_hierarchique := generer_numero_hierarchique(NEW.affaire_id, NEW.parent_id);
    END IF;
    
    -- Mettre à jour le niveau si parent_id est renseigné
    IF NEW.parent_id IS NOT NULL THEN
        SELECT COALESCE(niveau_hierarchie, 0) + 1
        INTO NEW.niveau_hierarchie
        FROM public.tbl_planification_activites
        WHERE id = NEW.parent_id;
    ELSE
        NEW.niveau_hierarchie := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gen_numero_hierarchique ON public.tbl_planification_activites;
CREATE TRIGGER trigger_gen_numero_hierarchique
    BEFORE INSERT OR UPDATE ON public.tbl_planification_activites
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generer_numero_hierarchique();

-- ============================================================================
-- 9️⃣ TRIGGER: Calculer dates selon dépendances
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_calculer_dates_dependances()
RETURNS TRIGGER AS $$
DECLARE
    activite_precedente RECORD;
    duree_activite INTERVAL;
BEGIN
    -- Si une dépendance est définie, calculer les dates
    IF NEW.activite_precedente_id IS NOT NULL AND NEW.type_dependance IS NOT NULL THEN
        -- Récupérer l'activité précédente
        SELECT date_debut_prevue, date_fin_prevue,
               (date_fin_prevue - date_debut_prevue) as duree
        INTO activite_precedente
        FROM public.tbl_planification_activites
        WHERE id = NEW.activite_precedente_id;
        
        IF FOUND THEN
            -- Calculer la durée de la nouvelle activité (si pas déjà définie)
            IF NEW.date_debut_prevue IS NULL OR NEW.date_fin_prevue IS NULL THEN
                duree_activite := COALESCE(NEW.date_fin_prevue - NEW.date_debut_prevue, INTERVAL '1 day');
            ELSE
                duree_activite := NEW.date_fin_prevue - NEW.date_debut_prevue;
            END IF;
            
            -- Appliquer la dépendance selon le type
            CASE NEW.type_dependance
                WHEN 'FS' THEN -- Finish-to-Start: fin prédecesseur -> début successeur
                    NEW.date_debut_prevue := activite_precedente.date_fin_prevue + INTERVAL '1 day';
                    NEW.date_fin_prevue := NEW.date_debut_prevue + duree_activite;
                WHEN 'SS' THEN -- Start-to-Start: début prédecesseur -> début successeur
                    NEW.date_debut_prevue := activite_precedente.date_debut_prevue;
                    NEW.date_fin_prevue := NEW.date_debut_prevue + duree_activite;
                WHEN 'FF' THEN -- Finish-to-Finish: fin prédecesseur -> fin successeur
                    NEW.date_fin_prevue := activite_precedente.date_fin_prevue;
                    NEW.date_debut_prevue := NEW.date_fin_prevue - duree_activite;
                WHEN 'SF' THEN -- Start-to-Finish: début prédecesseur -> fin successeur
                    NEW.date_fin_prevue := activite_precedente.date_debut_prevue;
                    NEW.date_debut_prevue := NEW.date_fin_prevue - duree_activite;
            END CASE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calc_dates_dependances ON public.tbl_planification_activites;
CREATE TRIGGER trigger_calc_dates_dependances
    BEFORE INSERT OR UPDATE ON public.tbl_planification_activites
    FOR EACH ROW
    WHEN (NEW.activite_precedente_id IS NOT NULL)
    EXECUTE FUNCTION trigger_calculer_dates_dependances();

-- ============================================================================
-- 🔟 RLS pour nouvelles tables
-- ============================================================================

-- tbl_planification_templates
ALTER TABLE public.tbl_planification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read templates" ON public.tbl_planification_templates;
CREATE POLICY "Users can read templates"
    ON public.tbl_planification_templates FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Planners can manage templates" ON public.tbl_planification_templates;
CREATE POLICY "Planners can manage templates"
    ON public.tbl_planification_templates FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité')
            )
        )
    );

-- tbl_planification_template_taches
ALTER TABLE public.tbl_planification_template_taches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read template tasks" ON public.tbl_planification_template_taches;
CREATE POLICY "Users can read template tasks"
    ON public.tbl_planification_template_taches FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Planners can manage template tasks" ON public.tbl_planification_template_taches;
CREATE POLICY "Planners can manage template tasks"
    ON public.tbl_planification_template_taches FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité')
            )
        )
    );

-- tbl_jours_feries
ALTER TABLE public.tbl_jours_feries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read holidays" ON public.tbl_jours_feries;
CREATE POLICY "Authenticated users can read holidays"
    ON public.tbl_jours_feries FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage holidays" ON public.tbl_jours_feries;
CREATE POLICY "Admins can manage holidays"
    ON public.tbl_jours_feries FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Responsable d''Activité')
            )
        )
    );

-- ============================================================================
-- 1️⃣1️⃣ COMMENTAIRES
-- ============================================================================
COMMENT ON TABLE public.tbl_planification_templates IS 'Templates de tâches récurrentes pour la planification';
COMMENT ON TABLE public.tbl_planification_template_taches IS 'Tâches individuelles dans un template de planification';
COMMENT ON TABLE public.tbl_jours_feries IS 'Jours fériés pour le calcul des jours ouvrés (excluant weekends)';
COMMENT ON COLUMN public.tbl_planification_activites.parent_id IS 'Référence à la tâche parente pour créer une hiérarchie';
COMMENT ON COLUMN public.tbl_planification_activites.numero_hierarchique IS 'Numéro hiérarchique généré automatiquement (ex: "1.1.1.1")';
COMMENT ON COLUMN public.tbl_planification_activites.niveau_hierarchie IS 'Niveau de profondeur dans la hiérarchie (0 = racine)';
COMMENT ON COLUMN public.tbl_planification_activites.duree_jours_ouvres IS 'Durée de l''activité en jours ouvrés (excluant weekends et fériés)';
COMMENT ON COLUMN public.tbl_planification_activites.calcul_auto_date_fin IS 'Si true, date_fin_prevue est calculée automatiquement depuis duree_jours_ouvres';

