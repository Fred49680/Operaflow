-- Migration 047 : Ajout statuts 'prolongee' et 'archivee' pour activités
-- Projet : OperaFlow
-- Description : Mettre à jour la contrainte CHECK pour autoriser les statuts 'prolongee' et 'archivee'
-- Date : 2025-01-11

-- Mettre à jour le CHECK constraint pour statut dans tbl_planification_activites
ALTER TABLE public.tbl_planification_activites 
DROP CONSTRAINT IF EXISTS tbl_planification_activites_statut_check;

ALTER TABLE public.tbl_planification_activites 
ADD CONSTRAINT tbl_planification_activites_statut_check 
CHECK (statut IN ('planifiee', 'lancee', 'suspendue', 'reportee', 'terminee', 'annulee', 'prolongee', 'archivee'));

COMMENT ON COLUMN public.tbl_planification_activites.statut IS 
'Statut de l''activité: planifiee (planifiée), lancee (lancée), suspendue (suspendue), reportee (reportée), terminee (terminée), annulee (annulée), prolongee (prolongée), archivee (archivée)';

