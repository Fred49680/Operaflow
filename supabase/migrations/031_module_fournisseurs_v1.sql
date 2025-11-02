-- Migration 031 : Module Gestion Fournisseurs & Clients (Partenaires) v1.0
-- Projet : OperaFlow
-- Description : Catalogue Clients & Fournisseurs avec multi-contacts et documents
-- Date : 2025-01-11
-- Basé sur : prdfournisseur.mdc

-- ============================================================================
-- 1️⃣ TABLE: tbl_partenaires (Clients et Fournisseurs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_partenaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    type_partenaire VARCHAR(20) NOT NULL CHECK (type_partenaire IN ('client', 'fournisseur', 'mixte')),
    raison_sociale VARCHAR(255) NOT NULL,
    siret VARCHAR(14), -- Numéro SIRET
    siren VARCHAR(9), -- Numéro SIREN
    code_interne VARCHAR(100), -- Code interne de l'entreprise
    
    -- Coordonnées principales
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'France',
    telephone_principal VARCHAR(20),
    email_principal VARCHAR(255),
    site_web VARCHAR(255),
    
    -- Informations complémentaires
    secteur_activite VARCHAR(255), -- Ex: "BTP", "Énergie", "Maintenance"
    forme_juridique VARCHAR(50), -- Ex: "SARL", "SA", "EURL"
    capital_social DECIMAL(15, 2), -- Capital social
    
    -- Statut et gestion
    statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'suspendu', 'archive')),
    
    -- Observations internes
    observations TEXT,
    notes_internes TEXT, -- Notes confidentielles RH/admin
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT chk_email_format CHECK (email_principal IS NULL OR email_principal ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_partenaires_type ON public.tbl_partenaires(type_partenaire);
CREATE INDEX IF NOT EXISTS idx_partenaires_statut ON public.tbl_partenaires(statut);
CREATE INDEX IF NOT EXISTS idx_partenaires_raison_sociale ON public.tbl_partenaires(raison_sociale);
CREATE INDEX IF NOT EXISTS idx_partenaires_siret ON public.tbl_partenaires(siret);
CREATE INDEX IF NOT EXISTS idx_partenaires_code_interne ON public.tbl_partenaires(code_interne);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_update_partenaires_updated_at ON public.tbl_partenaires;
CREATE TRIGGER trigger_update_partenaires_updated_at
    BEFORE UPDATE ON public.tbl_partenaires
    FOR EACH ROW
    EXECUTE FUNCTION update_collaborateurs_updated_at();

-- ============================================================================
-- 2️⃣ TABLE: tbl_partenaire_contacts (Contacts multiples par partenaire)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_partenaire_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partenaire_id UUID NOT NULL REFERENCES public.tbl_partenaires(id) ON DELETE CASCADE,
    
    -- Identification du contact
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    fonction VARCHAR(255), -- Ex: "Acheteur", "Chef de projet", "Responsable HSE"
    
    -- Coordonnées
    telephone_pro VARCHAR(20),
    telephone_mobile VARCHAR(20),
    email VARCHAR(255),
    
    -- Informations complémentaires
    disponibilite TEXT, -- Horaires, disponibilité (ex. "souvent sur site")
    observations TEXT, -- Observations internes (ex. "contact privilégié pour devis")
    
    -- Statut
    est_contact_principal BOOLEAN DEFAULT false, -- Un seul contact principal par partenaire
    statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT chk_contact_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_contacts_partenaire_id ON public.tbl_partenaire_contacts(partenaire_id);
CREATE INDEX IF NOT EXISTS idx_contacts_statut ON public.tbl_partenaire_contacts(statut);
CREATE INDEX IF NOT EXISTS idx_contacts_principal ON public.tbl_partenaire_contacts(partenaire_id, est_contact_principal) WHERE est_contact_principal = true;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_update_contacts_updated_at ON public.tbl_partenaire_contacts;
CREATE TRIGGER trigger_update_contacts_updated_at
    BEFORE UPDATE ON public.tbl_partenaire_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_collaborateurs_updated_at();

-- Fonction pour s'assurer qu'il n'y a qu'un seul contact principal par partenaire
CREATE OR REPLACE FUNCTION ensure_single_principal_contact()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.est_contact_principal = true THEN
        -- Désactiver les autres contacts principaux pour ce partenaire
        UPDATE public.tbl_partenaire_contacts
        SET est_contact_principal = false
        WHERE partenaire_id = NEW.partenaire_id
        AND id != NEW.id
        AND est_contact_principal = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_ensure_single_principal_contact ON public.tbl_partenaire_contacts;
CREATE TRIGGER trigger_ensure_single_principal_contact
    BEFORE INSERT OR UPDATE ON public.tbl_partenaire_contacts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_principal_contact();

-- ============================================================================
-- 3️⃣ TABLE: tbl_partenaire_documents (Documents liés aux partenaires)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_partenaire_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partenaire_id UUID NOT NULL REFERENCES public.tbl_partenaires(id) ON DELETE CASCADE,
    
    -- Identification du document
    type_document VARCHAR(100) NOT NULL, -- Ex: 'contrat_cadre', 'devis', 'attestation_urssaf', 'attestation_assurance', 'certificat_qualite', 'fiche_securite', 'correspondance', 'autre'
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dates
    date_emission DATE,
    date_expiration DATE, -- Pour suivi des validités
    
    -- Statut
    statut VARCHAR(20) DEFAULT 'valide' CHECK (statut IN ('valide', 'expire', 'en_attente', 'a_renouveler')),
    
    -- Stockage
    url_storage TEXT, -- Lien vers Supabase Storage ou lien externe (SharePoint, Drive)
    lien_externe TEXT, -- URL externe si applicable
    taille_octets BIGINT,
    nom_fichier_original VARCHAR(255),
    
    -- Liaison au site (optionnel)
    site_id UUID REFERENCES public.tbl_sites(site_id) ON DELETE SET NULL,
    
    -- Flags
    est_contrat_principal BOOLEAN DEFAULT false,
    est_document_reference BOOLEAN DEFAULT false,
    est_interne_rh BOOLEAN DEFAULT false, -- Document confidentiel RH
    
    -- Observations
    observations TEXT,
    
    -- Métadonnées
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_partenaire_id ON public.tbl_partenaire_documents(partenaire_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.tbl_partenaire_documents(type_document);
CREATE INDEX IF NOT EXISTS idx_documents_statut ON public.tbl_partenaire_documents(statut);
CREATE INDEX IF NOT EXISTS idx_documents_date_expiration ON public.tbl_partenaire_documents(date_expiration) WHERE date_expiration IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_site_id ON public.tbl_partenaire_documents(site_id);

-- Trigger pour mettre à jour le statut selon la date d'expiration
CREATE OR REPLACE FUNCTION update_document_statut_from_expiration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_expiration IS NOT NULL THEN
        IF NEW.date_expiration < CURRENT_DATE THEN
            NEW.statut := 'expire';
        ELSIF NEW.date_expiration <= CURRENT_DATE + INTERVAL '30 days' THEN
            NEW.statut := 'a_renouveler';
        ELSE
            NEW.statut := 'valide';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_statut ON public.tbl_partenaire_documents;
CREATE TRIGGER trigger_update_document_statut
    BEFORE INSERT OR UPDATE ON public.tbl_partenaire_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_statut_from_expiration();

-- ============================================================================
-- 4️⃣ TABLE: tbl_partenaire_sites (Liaison partenaires <-> sites)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_partenaire_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partenaire_id UUID NOT NULL REFERENCES public.tbl_partenaires(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.tbl_sites(site_id) ON DELETE CASCADE,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT uk_partenaire_site UNIQUE (partenaire_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_partenaire_sites_partenaire ON public.tbl_partenaire_sites(partenaire_id);
CREATE INDEX IF NOT EXISTS idx_partenaire_sites_site ON public.tbl_partenaire_sites(site_id);

-- ============================================================================
-- 5️⃣ VUES UTILES
-- ============================================================================

-- Vue pour les alertes de documents expirants
CREATE OR REPLACE VIEW public.v_alertes_documents_partenaires AS
SELECT 
    d.id,
    d.partenaire_id,
    p.raison_sociale,
    p.type_partenaire,
    d.titre,
    d.type_document,
    d.date_expiration,
    d.statut,
    d.site_id,
    s.site_label,
    s.site_code,
    CASE 
        WHEN d.date_expiration < CURRENT_DATE THEN 'expire'
        WHEN d.date_expiration <= CURRENT_DATE + INTERVAL '7 days' THEN 'expire_j7'
        WHEN d.date_expiration <= CURRENT_DATE + INTERVAL '30 days' THEN 'expire_j30'
        ELSE 'valide'
    END AS niveau_alerte,
    (d.date_expiration - CURRENT_DATE) AS jours_restants
FROM public.tbl_partenaire_documents d
JOIN public.tbl_partenaires p ON p.id = d.partenaire_id
LEFT JOIN public.tbl_sites s ON s.site_id = d.site_id
WHERE d.date_expiration IS NOT NULL
AND d.date_expiration <= CURRENT_DATE + INTERVAL '30 days'
AND p.statut = 'actif'
ORDER BY d.date_expiration ASC;

-- Vue pour le tableau de bord des partenaires
CREATE OR REPLACE VIEW public.v_partenaires_dashboard AS
SELECT 
    p.id,
    p.type_partenaire,
    p.raison_sociale,
    p.statut,
    p.secteur_activite,
    -- Statistiques contacts
    (SELECT COUNT(*) FROM public.tbl_partenaire_contacts WHERE partenaire_id = p.id AND statut = 'actif') AS nb_contacts_actifs,
    (SELECT COUNT(*) FROM public.tbl_partenaire_contacts WHERE partenaire_id = p.id AND est_contact_principal = true) AS nb_contact_principal,
    -- Statistiques documents
    (SELECT COUNT(*) FROM public.tbl_partenaire_documents WHERE partenaire_id = p.id) AS nb_documents,
    (SELECT COUNT(*) FROM public.tbl_partenaire_documents WHERE partenaire_id = p.id AND statut = 'expire') AS nb_documents_expires,
    (SELECT COUNT(*) FROM public.tbl_partenaire_documents WHERE partenaire_id = p.id AND statut = 'a_renouveler') AS nb_documents_a_renouveler,
    -- Statistiques sites
    (SELECT COUNT(*) FROM public.tbl_partenaire_sites WHERE partenaire_id = p.id) AS nb_sites_lies
FROM public.tbl_partenaires p;

-- ============================================================================
-- 6️⃣ ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- RLS pour tbl_partenaires
ALTER TABLE public.tbl_partenaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent voir les partenaires actifs" ON public.tbl_partenaires;
CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les partenaires actifs"
    ON public.tbl_partenaires FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "RH/Admin peuvent gérer les partenaires" ON public.tbl_partenaires;
CREATE POLICY "RH/Admin peuvent gérer les partenaires"
    ON public.tbl_partenaires FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Administrateur', 'Administratif RH', 'RH', 'Responsable d''Activité')
        )
    );

-- RLS pour tbl_partenaire_contacts
ALTER TABLE public.tbl_partenaire_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Même règles que les partenaires parentes pour contacts" ON public.tbl_partenaire_contacts;
CREATE POLICY "Même règles que les partenaires parentes pour contacts"
    ON public.tbl_partenaire_contacts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tbl_partenaires p
            WHERE p.id = partenaire_id
        )
    );

-- RLS pour tbl_partenaire_documents
ALTER TABLE public.tbl_partenaire_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous peuvent voir les documents non internes RH" ON public.tbl_partenaire_documents;
CREATE POLICY "Tous peuvent voir les documents non internes RH"
    ON public.tbl_partenaire_documents FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND (est_interne_rh = false OR est_interne_rh IS NULL)
    );

DROP POLICY IF EXISTS "RH/Admin peuvent voir tous les documents" ON public.tbl_partenaire_documents;
CREATE POLICY "RH/Admin peuvent voir tous les documents"
    ON public.tbl_partenaire_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Administrateur', 'Administratif RH', 'RH')
        )
    );

DROP POLICY IF EXISTS "RH/Admin peuvent gérer les documents" ON public.tbl_partenaire_documents;
CREATE POLICY "RH/Admin peuvent gérer les documents"
    ON public.tbl_partenaire_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Administrateur', 'Administratif RH', 'RH', 'Responsable d''Activité', 'Chargé d''Affaires')
        )
    );

-- RLS pour tbl_partenaire_sites
ALTER TABLE public.tbl_partenaire_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Même règles que les partenaires parentes pour sites" ON public.tbl_partenaire_sites;
CREATE POLICY "Même règles que les partenaires parentes pour sites"
    ON public.tbl_partenaire_sites FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tbl_partenaires p
            WHERE p.id = partenaire_id
        )
    );

-- ============================================================================
-- 7️⃣ COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE public.tbl_partenaires IS 'Catalogue Clients et Fournisseurs';
COMMENT ON TABLE public.tbl_partenaire_contacts IS 'Contacts multiples par partenaire (client/fournisseur)';
COMMENT ON TABLE public.tbl_partenaire_documents IS 'Documents liés aux partenaires (contrats, attestations, certificats)';
COMMENT ON TABLE public.tbl_partenaire_sites IS 'Liaison entre partenaires et sites';
COMMENT ON COLUMN public.tbl_partenaires.type_partenaire IS 'Type: client, fournisseur, ou mixte (les deux)';
COMMENT ON COLUMN public.tbl_partenaire_contacts.est_contact_principal IS 'Un seul contact principal par partenaire (géré par trigger)';
COMMENT ON COLUMN public.tbl_partenaire_documents.date_expiration IS 'Date d''expiration pour suivi des validités (génère alertes automatiques)';
COMMENT ON COLUMN public.tbl_partenaire_documents.est_interne_rh IS 'Document confidentiel RH (visible uniquement par RH/Admin)';

