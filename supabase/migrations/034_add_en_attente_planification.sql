-- Migration 034 : Ajout statut "en_attente_planification" pour les affaires
-- Projet : OperaFlow
-- Description : Ajout du workflow "En attente de planification" après création d'affaire
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ MODIFICATION TABLE: tbl_affaires - Ajout du nouveau statut
-- ============================================================================

-- Supprimer la contrainte existante
ALTER TABLE public.tbl_affaires
DROP CONSTRAINT IF EXISTS tbl_affaires_statut_check;

-- Ajouter la nouvelle contrainte avec le statut "en_attente_planification"
ALTER TABLE public.tbl_affaires
ADD CONSTRAINT tbl_affaires_statut_check 
CHECK (statut IN ('cree', 'en_attente_planification', 'pre_planifie', 'planifie', 'en_cours', 'suspendu', 'en_cloture', 'termine', 'archive'));

-- ============================================================================
-- 2️⃣ COMMENTAIRES
-- ============================================================================
COMMENT ON COLUMN public.tbl_affaires.statut IS 'Statut de l''affaire : cree (par défaut), en_attente_planification (envoyée au planificateur), pre_planifie, planifie, en_cours, suspendu, en_cloture, termine, archive';

