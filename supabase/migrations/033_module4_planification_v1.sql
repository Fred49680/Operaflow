-- Migration 033 : Module 4 Planification & Suivi v1.0
-- Projet : OperaFlow
-- Description : Implémentation complète du système de planification Gantt et suivi quotidien
-- Date : 2025-01-11
-- Référence : prdgantt.mdc

-- ============================================================================
-- 1️⃣ TABLE: tbl_planification_activites (Activités planifiées)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_activites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Liaisons
    affaire_id UUID NOT NULL REFERENCES public.tbl_affaires(id) ON DELETE CASCADE,
    lot_id UUID REFERENCES public.tbl_affaires_lots(id) ON DELETE SET NULL, -- Lot/jalon si applicable
    site_id UUID REFERENCES public.tbl_sites(site_id) ON DELETE SET NULL,
    
    -- Identification
    numero_activite VARCHAR(50), -- Ex: "ACT-001"
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Planification temporelle
    date_debut_prevue TIMESTAMPTZ NOT NULL,
    date_fin_prevue TIMESTAMPTZ NOT NULL,
    date_debut_reelle TIMESTAMPTZ,
    date_fin_reelle TIMESTAMPTZ,
    
    -- Ressources
    responsable_id UUID REFERENCES public.collaborateurs(id) ON DELETE SET NULL,
    -- Note: Les affectations de ressources sont dans tbl_planification_affectations
    
    -- Horaires
    heures_prevues DECIMAL(8, 2) NOT NULL DEFAULT 0, -- Total heures prévues
    heures_reelles DECIMAL(8, 2) DEFAULT 0, -- Total heures réelles saisies
    
    -- Valorisation
    type_horaire VARCHAR(20) DEFAULT 'jour' CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie')),
    coefficient DECIMAL(4, 2) DEFAULT 1.00, -- Coefficient paramétrable selon affaire
    
    -- Statut et avancement
    statut VARCHAR(30) NOT NULL DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'lancee', 'suspendue', 'reportee', 'terminee', 'annulee')),
    pourcentage_avancement DECIMAL(5, 2) DEFAULT 0, -- % automatique (réel vs prévu)
    
    -- Dépendances (pour Gantt)
    activite_precedente_id UUID REFERENCES public.tbl_planification_activites(id) ON DELETE SET NULL,
    type_dependance VARCHAR(10) CHECK (type_dependance IN ('FS', 'SS', 'FF', 'SF')), -- Finish-to-Start, Start-to-Start, etc.
    
    -- Métadonnées
    commentaire TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT chk_dates_activite CHECK (date_fin_prevue >= date_debut_prevue),
    CONSTRAINT chk_dates_reelles CHECK (
        (date_fin_reelle IS NULL AND date_debut_reelle IS NULL) OR
        (date_fin_reelle IS NOT NULL AND date_debut_reelle IS NOT NULL AND date_fin_reelle >= date_debut_reelle)
    )
);

CREATE INDEX IF NOT EXISTS idx_planif_activites_affaire_id ON public.tbl_planification_activites(affaire_id);
CREATE INDEX IF NOT EXISTS idx_planif_activites_lot_id ON public.tbl_planification_activites(lot_id);
CREATE INDEX IF NOT EXISTS idx_planif_activites_site_id ON public.tbl_planification_activites(site_id);
CREATE INDEX IF NOT EXISTS idx_planif_activites_responsable_id ON public.tbl_planification_activites(responsable_id);
CREATE INDEX IF NOT EXISTS idx_planif_activites_dates ON public.tbl_planification_activites(date_debut_prevue, date_fin_prevue);
CREATE INDEX IF NOT EXISTS idx_planif_activites_statut ON public.tbl_planification_activites(statut);
CREATE INDEX IF NOT EXISTS idx_planif_activites_precedente_id ON public.tbl_planification_activites(activite_precedente_id);

-- ============================================================================
-- 2️⃣ TABLE: tbl_planification_affectations (Affectation ressources aux activités)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_affectations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Liaisons
    activite_id UUID NOT NULL REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE,
    collaborateur_id UUID NOT NULL REFERENCES public.collaborateurs(id) ON DELETE CASCADE,
    
    -- Affectation
    date_debut_affectation TIMESTAMPTZ NOT NULL,
    date_fin_affectation TIMESTAMPTZ NOT NULL,
    heures_prevues_affectees DECIMAL(6, 2) NOT NULL, -- Heures prévues pour ce collaborateur sur cette activité
    heures_reelles_saisies DECIMAL(6, 2) DEFAULT 0, -- Heures réelles saisies
    
    -- Type horaire pour cette affectation (peut différer de l'activité)
    type_horaire VARCHAR(20) DEFAULT 'jour' CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie')),
    coefficient DECIMAL(4, 2) DEFAULT 1.00,
    
    -- Statut
    statut VARCHAR(30) DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'suspendue', 'terminee', 'annulee')),
    
    -- Métadonnées
    commentaire TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT chk_dates_affectation CHECK (date_fin_affectation >= date_debut_affectation),
    CONSTRAINT uq_activite_collab_dates UNIQUE (activite_id, collaborateur_id, date_debut_affectation) -- Éviter doublons
);

CREATE INDEX IF NOT EXISTS idx_planif_affectations_activite_id ON public.tbl_planification_affectations(activite_id);
CREATE INDEX IF NOT EXISTS idx_planif_affectations_collab_id ON public.tbl_planification_affectations(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_planif_affectations_dates ON public.tbl_planification_affectations(date_debut_affectation, date_fin_affectation);
CREATE INDEX IF NOT EXISTS idx_planif_affectations_statut ON public.tbl_planification_affectations(statut);

-- ============================================================================
-- 3️⃣ TABLE: tbl_planification_suivi_quotidien (Saisie terrain quotidienne)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_suivi_quotidien (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Liaisons
    activite_id UUID NOT NULL REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE,
    affectation_id UUID REFERENCES public.tbl_planification_affectations(id) ON DELETE SET NULL,
    collaborateur_id UUID NOT NULL REFERENCES public.collaborateurs(id) ON DELETE CASCADE,
    
    -- Date et horaires
    date_journee DATE NOT NULL,
    heure_debut TIME,
    heure_fin TIME,
    duree_pause_minutes INTEGER DEFAULT 0,
    heures_reelles DECIMAL(4, 2) NOT NULL, -- Heures réelles calculées
    
    -- Type horaire effectif
    type_horaire VARCHAR(20) DEFAULT 'jour' CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie')),
    coefficient DECIMAL(4, 2) DEFAULT 1.00,
    
    -- Suivi
    pourcentage_avancement_journee DECIMAL(5, 2) DEFAULT 0, -- Avancement pour cette journée
    statut VARCHAR(30) DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'terminee', 'suspendue', 'reportee')),
    
    -- Anomalies et commentaires
    commentaire TEXT,
    photo_url TEXT, -- Lien Supabase Storage pour photo terrain
    anomalie_detectee BOOLEAN DEFAULT false,
    claim_id UUID, -- Lien vers claim si anomalie créée
    
    -- Validation
    validee_par UUID REFERENCES auth.users(id),
    date_validation TIMESTAMPTZ,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT uq_suivi_activite_collab_date UNIQUE (activite_id, collaborateur_id, date_journee) -- Une saisie par jour/collab/activité
);

CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_activite_id ON public.tbl_planification_suivi_quotidien(activite_id);
CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_collab_id ON public.tbl_planification_suivi_quotidien(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_date ON public.tbl_planification_suivi_quotidien(date_journee);
CREATE INDEX IF NOT EXISTS idx_suivi_quotidien_affectation_id ON public.tbl_planification_suivi_quotidien(affectation_id);

-- ============================================================================
-- 4️⃣ TABLE: tbl_planification_coefficients (Coefficients horaires paramétrables par affaire)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_coefficients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Liaison
    affaire_id UUID REFERENCES public.tbl_affaires(id) ON DELETE CASCADE, -- NULL = valeur par défaut globale
    
    -- Coefficients
    coefficient_jour DECIMAL(4, 2) DEFAULT 1.00,
    coefficient_nuit DECIMAL(4, 2) DEFAULT 1.25,
    coefficient_weekend DECIMAL(4, 2) DEFAULT 1.50,
    coefficient_ferie DECIMAL(4, 2) DEFAULT 2.00,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT uq_coefficients_affaire UNIQUE (affaire_id) -- Un seul paramétrage par affaire
);

-- Valeurs par défaut globales (affaire_id = NULL)
INSERT INTO public.tbl_planification_coefficients (affaire_id, coefficient_jour, coefficient_nuit, coefficient_weekend, coefficient_ferie)
VALUES (NULL, 1.00, 1.25, 1.50, 2.00)
ON CONFLICT (affaire_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_coefficients_affaire_id ON public.tbl_planification_coefficients(affaire_id);

-- ============================================================================
-- 5️⃣ TABLE: tbl_planification_alertes (Alertes planification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_planification_alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Type d'alerte
    type_alerte VARCHAR(50) NOT NULL CHECK (type_alerte IN (
        'surcharge', 'retard', 'absence', 'non_conformite', 'claim', 'suraffectation'
    )),
    
    -- Contexte
    activite_id UUID REFERENCES public.tbl_planification_activites(id) ON DELETE CASCADE,
    affectation_id UUID REFERENCES public.tbl_planification_affectations(id) ON DELETE CASCADE,
    collaborateur_id UUID REFERENCES public.collaborateurs(id) ON DELETE SET NULL,
    affaire_id UUID REFERENCES public.tbl_affaires(id) ON DELETE CASCADE,
    
    -- Détails
    message TEXT NOT NULL,
    gravite VARCHAR(20) DEFAULT 'info' CHECK (gravite IN ('info', 'warning', 'error', 'critical')),
    
    -- Statut
    statut VARCHAR(20) DEFAULT 'active' CHECK (statut IN ('active', 'resolue', 'archivee')),
    resolue_par UUID REFERENCES auth.users(id),
    date_resolution TIMESTAMPTZ,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planif_alertes_type ON public.tbl_planification_alertes(type_alerte);
CREATE INDEX IF NOT EXISTS idx_planif_alertes_statut ON public.tbl_planification_alertes(statut);
CREATE INDEX IF NOT EXISTS idx_planif_alertes_activite_id ON public.tbl_planification_alertes(activite_id);
CREATE INDEX IF NOT EXISTS idx_planif_alertes_gravite ON public.tbl_planification_alertes(gravite);

-- ============================================================================
-- 6️⃣ TRIGGERS : updated_at automatique
-- ============================================================================
CREATE OR REPLACE FUNCTION update_planification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activites_updated_at ON public.tbl_planification_activites;
CREATE TRIGGER trigger_update_activites_updated_at
    BEFORE UPDATE ON public.tbl_planification_activites
    FOR EACH ROW
    EXECUTE FUNCTION update_planification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_affectations_updated_at ON public.tbl_planification_affectations;
CREATE TRIGGER trigger_update_affectations_updated_at
    BEFORE UPDATE ON public.tbl_planification_affectations
    FOR EACH ROW
    EXECUTE FUNCTION update_planification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_suivi_updated_at ON public.tbl_planification_suivi_quotidien;
CREATE TRIGGER trigger_update_suivi_updated_at
    BEFORE UPDATE ON public.tbl_planification_suivi_quotidien
    FOR EACH ROW
    EXECUTE FUNCTION update_planification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_coefficients_updated_at ON public.tbl_planification_coefficients;
CREATE TRIGGER trigger_update_coefficients_updated_at
    BEFORE UPDATE ON public.tbl_planification_coefficients
    FOR EACH ROW
    EXECUTE FUNCTION update_planification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_alertes_updated_at ON public.tbl_planification_alertes;
CREATE TRIGGER trigger_update_alertes_updated_at
    BEFORE UPDATE ON public.tbl_planification_alertes
    FOR EACH ROW
    EXECUTE FUNCTION update_planification_updated_at();

-- ============================================================================
-- 7️⃣ FONCTIONS : Calculs automatiques
-- ============================================================================

-- Fonction : Calculer le pourcentage d'avancement d'une activité
CREATE OR REPLACE FUNCTION calculer_avancement_activite(activite_uuid UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    heures_prevues_activite DECIMAL(8, 2);
    heures_reelles_totales DECIMAL(8, 2);
    avancement DECIMAL(5, 2);
BEGIN
    -- Récupérer heures prévues
    SELECT heures_prevues INTO heures_prevues_activite
    FROM public.tbl_planification_activites
    WHERE id = activite_uuid;
    
    IF heures_prevues_activite IS NULL OR heures_prevues_activite = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculer total heures réelles (depuis affectations ou suivi quotidien)
    SELECT COALESCE(SUM(heures_reelles_saisies), 0) INTO heures_reelles_totales
    FROM public.tbl_planification_affectations
    WHERE activite_id = activite_uuid;
    
    -- Si pas d'affectations, utiliser suivi quotidien
    IF heures_reelles_totales = 0 THEN
        SELECT COALESCE(SUM(heures_reelles), 0) INTO heures_reelles_totales
        FROM public.tbl_planification_suivi_quotidien
        WHERE activite_id = activite_uuid;
    END IF;
    
    -- Calculer pourcentage
    avancement := LEAST((heures_reelles_totales / heures_prevues_activite) * 100, 100);
    
    RETURN ROUND(avancement, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction : Détecter surcharge ressource
CREATE OR REPLACE FUNCTION detecter_surcharge_ressource(collab_uuid UUID, date_check DATE)
RETURNS BOOLEAN AS $$
DECLARE
    charge_totale DECIMAL(6, 2);
    charge_max DECIMAL(6, 2) := 8.0; -- 8 heures par défaut (paramétrable)
BEGIN
    -- Calculer total heures affectées pour cette ressource à cette date
    SELECT COALESCE(SUM(heures_prevues_affectees), 0) INTO charge_totale
    FROM public.tbl_planification_affectations
    WHERE collaborateur_id = collab_uuid
      AND date_debut_affectation <= date_check::TIMESTAMPTZ
      AND date_fin_affectation >= date_check::TIMESTAMPTZ
      AND statut IN ('planifiee', 'en_cours');
    
    RETURN charge_totale > charge_max;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8️⃣ RLS (Row Level Security)
-- ============================================================================

-- tbl_planification_activites
ALTER TABLE public.tbl_planification_activites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read activities in their sites" ON public.tbl_planification_activites;
CREATE POLICY "Users can read activities in their sites"
    ON public.tbl_planification_activites FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Admin voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name = 'Administrateur'
            ) OR
            -- Planificateur / Responsable / Chargé d'Affaires voient leurs activités
            EXISTS (
                SELECT 1 FROM public.tbl_affaires a
                WHERE a.id = tbl_planification_activites.affaire_id
                AND (
                    a.charge_affaires_id IN (
                        SELECT c.id FROM public.collaborateurs c WHERE c.user_id = auth.uid()
                    ) OR
                    a.site_id IN (
                        SELECT ur.site_id::UUID FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.site_id IS NOT NULL
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage activities in their scope" ON public.tbl_planification_activites;
CREATE POLICY "Users can manage activities in their scope"
    ON public.tbl_planification_activites FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

-- tbl_planification_affectations
ALTER TABLE public.tbl_planification_affectations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read affectations in their scope" ON public.tbl_planification_affectations;
CREATE POLICY "Users can read affectations in their scope"
    ON public.tbl_planification_affectations FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name = 'Administrateur'
            ) OR
            -- Les collaborateurs voient leurs propres affectations
            collaborateur_id IN (
                SELECT c.id FROM public.collaborateurs c WHERE c.user_id = auth.uid()
            ) OR
            -- Planificateur / Responsable voient tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Planificateur', 'Responsable d''Activité')
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage affectations in their scope" ON public.tbl_planification_affectations;
CREATE POLICY "Users can manage affectations in their scope"
    ON public.tbl_planification_affectations FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité')
            )
        )
    );

-- tbl_planification_suivi_quotidien
ALTER TABLE public.tbl_planification_suivi_quotidien ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read suivi in their scope" ON public.tbl_planification_suivi_quotidien;
CREATE POLICY "Users can read suivi in their scope"
    ON public.tbl_planification_suivi_quotidien FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name = 'Administrateur'
            ) OR
            -- Collaborateurs voient leur propre suivi
            collaborateur_id IN (
                SELECT c.id FROM public.collaborateurs c WHERE c.user_id = auth.uid()
            ) OR
            -- Chef de Chantier / Responsable voient leur périmètre
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Chef de Chantier', 'Responsable d''Activité', 'Planificateur')
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage suivi in their scope" ON public.tbl_planification_suivi_quotidien;
CREATE POLICY "Users can manage suivi in their scope"
    ON public.tbl_planification_suivi_quotidien FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name = 'Administrateur'
            ) OR
            -- Collaborateurs peuvent saisir leur propre suivi
            collaborateur_id IN (
                SELECT c.id FROM public.collaborateurs c WHERE c.user_id = auth.uid()
            ) OR
            -- Chef de Chantier / Responsable peuvent valider
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Chef de Chantier', 'Responsable d''Activité')
            )
        )
    );

-- tbl_planification_coefficients (lecture pour tous, écriture admin/responsable)
ALTER TABLE public.tbl_planification_coefficients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read coefficients" ON public.tbl_planification_coefficients;
CREATE POLICY "Authenticated users can read coefficients"
    ON public.tbl_planification_coefficients FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Responsables can manage coefficients" ON public.tbl_planification_coefficients;
CREATE POLICY "Responsables can manage coefficients"
    ON public.tbl_planification_coefficients FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

-- tbl_planification_alertes
ALTER TABLE public.tbl_planification_alertes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read alertes in their scope" ON public.tbl_planification_alertes;
CREATE POLICY "Users can read alertes in their scope"
    ON public.tbl_planification_alertes FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage alertes in their scope" ON public.tbl_planification_alertes;
CREATE POLICY "Users can manage alertes in their scope"
    ON public.tbl_planification_alertes FOR ALL
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité')
            )
        )
    );

-- ============================================================================
-- 9️⃣ COMMENTAIRES
-- ============================================================================
COMMENT ON TABLE public.tbl_planification_activites IS 'Activités planifiées dans le Gantt (Site > Affaire > Activité > Ressource)';
COMMENT ON TABLE public.tbl_planification_affectations IS 'Affectation des collaborateurs aux activités avec horaires';
COMMENT ON TABLE public.tbl_planification_suivi_quotidien IS 'Saisie terrain quotidienne des heures réelles';
COMMENT ON TABLE public.tbl_planification_coefficients IS 'Coefficients horaires paramétrables par affaire (jour/nuit/weekend/férié)';
COMMENT ON TABLE public.tbl_planification_alertes IS 'Alertes automatiques planification (surcharge, retard, absence, etc.)';

COMMENT ON COLUMN public.tbl_planification_activites.type_dependance IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN public.tbl_planification_activites.pourcentage_avancement IS 'Calculé automatiquement : (heures réelles / heures prévues) * 100';

