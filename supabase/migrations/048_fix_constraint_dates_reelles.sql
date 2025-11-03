-- Migration 048 : Correction contrainte dates réelles pour autoriser date_debut_reelle seul
-- Projet : OperaFlow
-- Description : Modifier la contrainte pour permettre date_debut_reelle seul (lors du lancement d'activité)
-- Date : 2025-01-11

-- Supprimer l'ancienne contrainte
ALTER TABLE public.tbl_planification_activites 
DROP CONSTRAINT IF EXISTS chk_dates_reelles;

-- Nouvelle contrainte : permet date_debut_reelle seul, mais si date_fin_reelle est définie, date_debut_reelle doit l'être aussi
ALTER TABLE public.tbl_planification_activites 
ADD CONSTRAINT chk_dates_reelles CHECK (
    -- Cas 1 : Les deux sont NULL
    (date_debut_reelle IS NULL AND date_fin_reelle IS NULL) OR
    -- Cas 2 : date_debut_reelle seul (autorise au lancement)
    (date_debut_reelle IS NOT NULL AND date_fin_reelle IS NULL) OR
    -- Cas 3 : Les deux sont définies et date_fin_reelle >= date_debut_reelle
    (date_debut_reelle IS NOT NULL AND date_fin_reelle IS NOT NULL AND date_fin_reelle >= date_debut_reelle)
    -- Note : on n'autorise PAS date_fin_reelle seule (illogique)
);

COMMENT ON CONSTRAINT chk_dates_reelles ON public.tbl_planification_activites IS 
'Contrainte dates réelles : permet date_debut_reelle seul (lors du lancement), ou les deux ensemble avec date_fin_reelle >= date_debut_reelle';

