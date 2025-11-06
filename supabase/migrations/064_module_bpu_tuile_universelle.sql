-- Migration 064 : Module BPU - Tuile Universelle et Facturation
-- Projet : OperaFlow
-- Description : Structure pour gestion activités terrain, tuile universelle et facturation
-- Date : 2025-01-XX

-- ============================================================================
-- 1️⃣ MODIFICATION TABLE: tbl_affaires - Type valorisation
-- ============================================================================
-- Modifier le champ type_valorisation pour correspondre au PRD (BPU ou Dépense Contrôlée)

-- D'abord, supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.tbl_affaires
DROP CONSTRAINT IF EXISTS tbl_affaires_type_valorisation_check;

-- Mettre à jour TOUTES les valeurs existantes AVANT d'appliquer la nouvelle contrainte
UPDATE public.tbl_affaires
SET type_valorisation = CASE 
    WHEN type_valorisation = 'BPU' THEN 'BPU'
    WHEN type_valorisation IN ('forfait', 'dépense', 'mixte', 'depense_controlee') THEN 'depense_controlee'
    WHEN type_valorisation IS NULL THEN 'BPU'  -- Valeur par défaut si NULL
    ELSE 'BPU'  -- Valeur par défaut pour toute autre valeur inconnue
END;

-- Maintenant, appliquer la nouvelle contrainte
ALTER TABLE public.tbl_affaires
ADD CONSTRAINT tbl_affaires_type_valorisation_check 
CHECK (type_valorisation IN ('BPU', 'depense_controlee'));

COMMENT ON COLUMN public.tbl_affaires.type_valorisation IS 'Type de valorisation : BPU (Bordereau Prix Unitaires) ou depense_controlee (Dépense Contrôlée)';

-- ============================================================================
-- 2️⃣ TABLE: tbl_motifs_report (Motifs de report réutilisables)
-- ============================================================================
-- Créer d'abord cette table car elle est référencée par tbl_saisies_quotidiennes
CREATE TABLE IF NOT EXISTS public.tbl_motifs_report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Motif
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Fréquence d'utilisation (pour tri dans liste cliquable)
    frequence_utilisation INTEGER DEFAULT 0,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_motifs_frequence ON public.tbl_motifs_report(frequence_utilisation DESC);

-- Trigger updated_at pour motifs
CREATE OR REPLACE FUNCTION update_motifs_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_motifs_updated_at ON public.tbl_motifs_report;
CREATE TRIGGER trigger_update_motifs_updated_at
    BEFORE UPDATE ON public.tbl_motifs_report
    FOR EACH ROW
    EXECUTE FUNCTION update_motifs_report_updated_at();

-- Fonction pour incrémenter la fréquence d'utilisation d'un motif
CREATE OR REPLACE FUNCTION incrementer_frequence_motif(p_motif_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.tbl_motifs_report
    SET frequence_utilisation = frequence_utilisation + 1
    WHERE id = p_motif_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3️⃣ TABLE: tbl_activites_terrain (Activités de terrain distinctes de planification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_activites_terrain (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    libelle VARCHAR(255) NOT NULL,
    affaire_id UUID REFERENCES public.tbl_affaires(id) ON DELETE CASCADE,
    
    -- Champs obligatoires
    ot VARCHAR(100), -- Ordre de Travail (format: 123456-01)
    tranche INTEGER CHECK (tranche >= 0 AND tranche <= 9),
    systeme_elementaire VARCHAR(100),
    type_activite VARCHAR(100),
    
    -- Type horaire (si mode BPU)
    type_horaire VARCHAR(50), -- HN, WE, Nuit, 3x8, etc.
    
    -- Commentaire interne
    commentaire TEXT,
    
    -- État opérationnel (mémoire interne)
    statut VARCHAR(20) NOT NULL DEFAULT 'planifiee' 
        CHECK (statut IN ('planifiee', 'lancee', 'reportee', 'terminee')),
    
    -- Dates opérationnelles
    date_debut DATE, -- Date de lancement (premier "Réalisé")
    date_fin DATE, -- Date de terminaison
    
    -- Flag pour activités créées à la volée
    a_rattacher BOOLEAN DEFAULT false, -- Flag "À rattacher par Conducteur"
    
    -- Poste BPU (déterminé lors de la création, lié au type d'activité)
    poste_bpu_id UUID REFERENCES public.tbl_affaires_bpu(id) ON DELETE SET NULL,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT chk_dates_activite_terrain CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut)
);

CREATE INDEX IF NOT EXISTS idx_activites_terrain_affaire_id ON public.tbl_activites_terrain(affaire_id);
CREATE INDEX IF NOT EXISTS idx_activites_terrain_statut ON public.tbl_activites_terrain(statut);
CREATE INDEX IF NOT EXISTS idx_activites_terrain_date_debut ON public.tbl_activites_terrain(date_debut);
CREATE INDEX IF NOT EXISTS idx_activites_terrain_a_rattacher ON public.tbl_activites_terrain(a_rattacher) WHERE a_rattacher = true;
CREATE INDEX IF NOT EXISTS idx_activites_terrain_ot ON public.tbl_activites_terrain(ot) WHERE ot IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_activites_terrain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activites_terrain_updated_at ON public.tbl_activites_terrain;
CREATE TRIGGER trigger_update_activites_terrain_updated_at
    BEFORE UPDATE ON public.tbl_activites_terrain
    FOR EACH ROW
    EXECUTE FUNCTION update_activites_terrain_updated_at();

-- ============================================================================
-- 4️⃣ TABLE: tbl_saisies_quotidiennes (Saisies de la tuile universelle)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_saisies_quotidiennes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Références
    activite_id UUID NOT NULL REFERENCES public.tbl_activites_terrain(id) ON DELETE CASCADE,
    collaborateur_id UUID NOT NULL REFERENCES public.collaborateurs(id) ON DELETE CASCADE,
    affaire_id UUID NOT NULL REFERENCES public.tbl_affaires(id) ON DELETE CASCADE,
    
    -- Date de la saisie
    date_saisie DATE NOT NULL,
    
    -- Statut du jour
    statut_jour VARCHAR(20) NOT NULL 
        CHECK (statut_jour IN ('realise', 'reporte', 'termine')),
    
    -- Motif de report (si reporté)
    motif_report TEXT,
    motif_report_id UUID REFERENCES public.tbl_motifs_report(id) ON DELETE SET NULL,
    
    -- Commentaire de la saisie
    commentaire TEXT,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Contrainte : une seule saisie "realise" par jour pour une activité (mais plusieurs "reporte" ou "termine" possibles)
    CONSTRAINT uq_saisie_realise_jour UNIQUE (activite_id, date_saisie, statut_jour) 
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_saisies_activite_id ON public.tbl_saisies_quotidiennes(activite_id);
CREATE INDEX IF NOT EXISTS idx_saisies_collaborateur_id ON public.tbl_saisies_quotidiennes(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_saisies_affaire_id ON public.tbl_saisies_quotidiennes(affaire_id);
CREATE INDEX IF NOT EXISTS idx_saisies_date_saisie ON public.tbl_saisies_quotidiennes(date_saisie);
CREATE INDEX IF NOT EXISTS idx_saisies_statut_jour ON public.tbl_saisies_quotidiennes(statut_jour);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_update_saisies_updated_at ON public.tbl_saisies_quotidiennes;
CREATE TRIGGER trigger_update_saisies_updated_at
    BEFORE UPDATE ON public.tbl_saisies_quotidiennes
    FOR EACH ROW
    EXECUTE FUNCTION update_activites_terrain_updated_at();

-- ============================================================================
-- 5️⃣ TRIGGERS : Mise à jour automatique des statuts d'activité
-- ============================================================================

-- Fonction pour mettre à jour le statut de l'activité selon les saisies
CREATE OR REPLACE FUNCTION update_statut_activite_terrain()
RETURNS TRIGGER AS $$
DECLARE
    v_premiere_saisie_realise DATE;
    v_derniere_saisie_termine DATE;
    v_activite_statut VARCHAR(20);
BEGIN
    -- Récupérer la première saisie "realise" pour cette activité
    SELECT MIN(date_saisie) INTO v_premiere_saisie_realise
    FROM public.tbl_saisies_quotidiennes
    WHERE activite_id = NEW.activite_id AND statut_jour = 'realise';
    
    -- Récupérer la dernière saisie "termine" pour cette activité
    SELECT MAX(date_saisie) INTO v_derniere_saisie_termine
    FROM public.tbl_saisies_quotidiennes
    WHERE activite_id = NEW.activite_id AND statut_jour = 'termine';
    
    -- Déterminer le nouveau statut
    IF v_derniere_saisie_termine IS NOT NULL THEN
        v_activite_statut := 'terminee';
    ELSIF v_premiere_saisie_realise IS NOT NULL THEN
        v_activite_statut := 'lancee';
    ELSE
        -- Vérifier s'il y a des saisies "reporte" pour déterminer si c'est "reportee" ou "planifiee"
        IF EXISTS (
            SELECT 1 FROM public.tbl_saisies_quotidiennes 
            WHERE activite_id = NEW.activite_id 
            AND statut_jour = 'reporte'
            AND date_saisie >= CURRENT_DATE - INTERVAL '7 days'
        ) THEN
            v_activite_statut := 'reportee';
        ELSE
            v_activite_statut := 'planifiee';
        END IF;
    END IF;
    
    -- Mettre à jour l'activité
    UPDATE public.tbl_activites_terrain
    SET 
        statut = v_activite_statut,
        date_debut = CASE 
            WHEN v_premiere_saisie_realise IS NOT NULL AND date_debut IS NULL 
            THEN v_premiere_saisie_realise 
            ELSE date_debut 
        END,
        date_fin = CASE 
            WHEN v_derniere_saisie_termine IS NOT NULL 
            THEN v_derniere_saisie_termine 
            ELSE date_fin 
        END,
        updated_at = NOW()
    WHERE id = NEW.activite_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger après insertion/mise à jour de saisie
DROP TRIGGER IF EXISTS trigger_update_statut_activite_terrain ON public.tbl_saisies_quotidiennes;
CREATE TRIGGER trigger_update_statut_activite_terrain
    AFTER INSERT OR UPDATE ON public.tbl_saisies_quotidiennes
    FOR EACH ROW
    EXECUTE FUNCTION update_statut_activite_terrain();

-- ============================================================================
-- 6️⃣ RLS POLICIES
-- ============================================================================

-- tbl_motifs_report
ALTER TABLE public.tbl_motifs_report ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent voir les motifs" ON public.tbl_motifs_report;
CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les motifs" ON public.tbl_motifs_report
    FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Conducteur et Admin peuvent gérer les motifs" ON public.tbl_motifs_report;
CREATE POLICY "Conducteur et Admin peuvent gérer les motifs" ON public.tbl_motifs_report
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT auth.uid())
            AND r.name IN ('Conducteur de travaux', 'Administrateur')
        )
    );

-- ============================================================================
-- 7️⃣ RLS POLICIES (suite)
-- ============================================================================

-- tbl_activites_terrain
ALTER TABLE public.tbl_activites_terrain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent voir les activités terrain" ON public.tbl_activites_terrain;
CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les activités terrain" ON public.tbl_activites_terrain
    FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Conducteur et Admin peuvent gérer les activités terrain" ON public.tbl_activites_terrain;
CREATE POLICY "Conducteur et Admin peuvent gérer les activités terrain" ON public.tbl_activites_terrain
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT auth.uid())
            AND r.name IN ('Conducteur de travaux', 'Administrateur', 'Chargé d''Affaires')
        )
    );

-- tbl_saisies_quotidiennes
ALTER TABLE public.tbl_saisies_quotidiennes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs saisies et celles de leur équipe" ON public.tbl_saisies_quotidiennes;
CREATE POLICY "Utilisateurs peuvent voir leurs saisies et celles de leur équipe" ON public.tbl_saisies_quotidiennes
    FOR SELECT
    USING (
        (SELECT auth.uid()) IS NOT NULL
        AND (
            collaborateur_id IN (
                SELECT id FROM public.collaborateurs WHERE user_id = (SELECT auth.uid())
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (SELECT auth.uid())
                AND r.name IN ('Chef de Chantier', 'Responsable d''Activité', 'Conducteur de travaux', 'Administrateur')
            )
        )
    );

DROP POLICY IF EXISTS "Chef de chantier et opérateurs peuvent créer des saisies" ON public.tbl_saisies_quotidiennes;
CREATE POLICY "Chef de chantier et opérateurs peuvent créer des saisies" ON public.tbl_saisies_quotidiennes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = (SELECT auth.uid())
            AND r.name IN ('Chef de Chantier', 'Technicien', 'Conducteur de travaux', 'Administrateur')
        )
        OR collaborateur_id IN (
            SELECT id FROM public.collaborateurs WHERE user_id = (SELECT auth.uid())
        )
    );

