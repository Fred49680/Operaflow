-- Migration 039 : Correction search_path pour fonctions
-- Projet : OperaFlow
-- Description : Ajouter SET search_path aux fonctions pour éviter les warnings
-- Date : 2025-01-11

-- 1️⃣ Fonction ensure_single_principal_contact
CREATE OR REPLACE FUNCTION ensure_single_principal_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 2️⃣ Fonction update_document_statut_from_expiration
CREATE OR REPLACE FUNCTION update_document_statut_from_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
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
$$;

-- 3️⃣ Fonction calculate_formation_echeance_validite
CREATE OR REPLACE FUNCTION calculate_formation_echeance_validite()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_validite_mois INTEGER;
BEGIN
    -- Récupérer la validité depuis le catalogue si disponible
    IF NEW.catalogue_formation_id IS NOT NULL THEN
        SELECT periodicite_validite_mois INTO v_validite_mois
        FROM public.tbl_catalogue_formations
        WHERE id = NEW.catalogue_formation_id;
        
        IF v_validite_mois IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
            NEW.date_echeance_validite := (NEW.date_fin + (v_validite_mois || ' months')::INTERVAL)::DATE;
            NEW.validite_mois := v_validite_mois;
        END IF;
    ELSIF NEW.validite_mois IS NOT NULL AND NEW.date_fin IS NOT NULL THEN
        -- Utiliser validite_mois si défini directement
        NEW.date_echeance_validite := (NEW.date_fin + (NEW.validite_mois || ' months')::INTERVAL)::DATE;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ensure_single_principal_contact() IS 'Garantit un seul contact principal par partenaire (search_path fixe)';
COMMENT ON FUNCTION update_document_statut_from_expiration() IS 'Met à jour le statut d''un document selon sa date d''expiration (search_path fixe)';
COMMENT ON FUNCTION calculate_formation_echeance_validite() IS 'Calcule automatiquement la date d''échéance de validité d''une formation (search_path fixe)';

