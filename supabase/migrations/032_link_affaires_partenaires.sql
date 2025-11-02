-- Migration 032 : Liaison Affaires - Partenaires & Contacts
-- Projet : OperaFlow
-- Description : Ajout des relations entre affaires et partenaires/contacts
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ MODIFICATION TABLE: tbl_affaires
-- ============================================================================

-- Ajouter les champs de relation avec partenaires
ALTER TABLE public.tbl_affaires
ADD COLUMN IF NOT EXISTS partenaire_id UUID REFERENCES public.tbl_partenaires(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.tbl_partenaire_contacts(id) ON DELETE SET NULL;

-- Supprimer le champ client_code (remplacé par partenaire_id)
ALTER TABLE public.tbl_affaires
DROP COLUMN IF EXISTS client_code;

-- Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_affaires_partenaire_id ON public.tbl_affaires(partenaire_id);
CREATE INDEX IF NOT EXISTS idx_affaires_contact_id ON public.tbl_affaires(contact_id);

-- ============================================================================
-- 2️⃣ MIGRATION DES DONNÉES EXISTANTES (si nécessaire)
-- ============================================================================

-- Note: Les données existantes dans le champ `client` (texte libre) seront conservées
-- pour compatibilité mais ne seront plus utilisées pour les nouvelles affaires.

-- ============================================================================
-- 3️⃣ COMMENTAIRES
-- ============================================================================

COMMENT ON COLUMN public.tbl_affaires.partenaire_id IS 'Partenaire (client/fournisseur) lié à l''affaire';
COMMENT ON COLUMN public.tbl_affaires.contact_id IS 'Contact spécifique du partenaire (optionnel)';

