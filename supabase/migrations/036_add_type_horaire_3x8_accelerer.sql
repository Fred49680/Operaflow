-- Migration 036 : Ajout types horaires 3x8 et accéléré
-- Projet : OperaFlow
-- Description : Ajout des types horaires 3x8 et accéléré pour flexibilité planning
-- Date : 2025-01-11

-- Mettre à jour le CHECK constraint pour type_horaire dans tbl_planification_activites
ALTER TABLE public.tbl_planification_activites 
DROP CONSTRAINT IF EXISTS tbl_planification_activites_type_horaire_check;

ALTER TABLE public.tbl_planification_activites 
ADD CONSTRAINT tbl_planification_activites_type_horaire_check 
CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie', '3x8', 'accelerer'));

-- Mettre à jour le CHECK constraint dans tbl_planification_affectations
ALTER TABLE public.tbl_planification_affectations 
DROP CONSTRAINT IF EXISTS tbl_planification_affectations_type_horaire_check;

ALTER TABLE public.tbl_planification_affectations 
ADD CONSTRAINT tbl_planification_affectations_type_horaire_check 
CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie', '3x8', 'accelerer'));

-- Mettre à jour le CHECK constraint dans tbl_planification_suivi_quotidien
ALTER TABLE public.tbl_planification_suivi_quotidien 
DROP CONSTRAINT IF EXISTS tbl_planification_suivi_quotidien_type_horaire_check;

ALTER TABLE public.tbl_planification_suivi_quotidien 
ADD CONSTRAINT tbl_planification_suivi_quotidien_type_horaire_check 
CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie', '3x8', 'accelerer'));

-- Mettre à jour le CHECK constraint dans tbl_planification_template_taches
ALTER TABLE public.tbl_planification_template_taches 
DROP CONSTRAINT IF EXISTS tbl_planification_template_taches_type_horaire_check;

ALTER TABLE public.tbl_planification_template_taches 
ADD CONSTRAINT tbl_planification_template_taches_type_horaire_check 
CHECK (type_horaire IN ('jour', 'nuit', 'weekend', 'ferie', '3x8', 'accelerer'));

-- Trigger pour mettre à jour le pourcentage_avancement depuis suivi quotidien
CREATE OR REPLACE FUNCTION trigger_update_pourcentage_avancement()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le pourcentage d'avancement de l'activité liée
    IF NEW.activite_id IS NOT NULL THEN
        UPDATE public.tbl_planification_activites
        SET pourcentage_avancement = calculer_avancement_activite(NEW.activite_id),
            updated_at = NOW()
        WHERE id = NEW.activite_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_avancement_from_suivi ON public.tbl_planification_suivi_quotidien;
CREATE TRIGGER trigger_update_avancement_from_suivi
    AFTER INSERT OR UPDATE ON public.tbl_planification_suivi_quotidien
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_pourcentage_avancement();

DROP TRIGGER IF EXISTS trigger_update_avancement_from_affectation ON public.tbl_planification_affectations;
CREATE TRIGGER trigger_update_avancement_from_affectation
    AFTER INSERT OR UPDATE OF heures_reelles_saisies ON public.tbl_planification_affectations
    FOR EACH ROW
    WHEN (NEW.heures_reelles_saisies IS NOT NULL)
    EXECUTE FUNCTION trigger_update_pourcentage_avancement();

