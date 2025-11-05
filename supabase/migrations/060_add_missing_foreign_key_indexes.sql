-- ============================================
-- Migration 060: Ajout d'index sur les clés étrangères manquantes
-- ============================================
-- 
-- Cette migration ajoute des index sur toutes les clés étrangères
-- qui n'ont pas d'index couvrant, améliorant ainsi les performances
-- des jointures et des requêtes de filtrage.
--

-- Table: absences
CREATE INDEX IF NOT EXISTS idx_absences_catalogue_absence_id ON public.absences(catalogue_absence_id);
CREATE INDEX IF NOT EXISTS idx_absences_created_by ON public.absences(created_by);
CREATE INDEX IF NOT EXISTS idx_absences_updated_by ON public.absences(updated_by);
CREATE INDEX IF NOT EXISTS idx_absences_valide_par ON public.absences(valide_par);
CREATE INDEX IF NOT EXISTS idx_absences_valide_par_n1 ON public.absences(valide_par_n1);
CREATE INDEX IF NOT EXISTS idx_absences_valide_par_rh ON public.absences(valide_par_rh);

-- Table: catalogue_absences
CREATE INDEX IF NOT EXISTS idx_catalogue_absences_created_by ON public.catalogue_absences(created_by);
CREATE INDEX IF NOT EXISTS idx_catalogue_absences_updated_by ON public.catalogue_absences(updated_by);

-- Table: collaborateurs
CREATE INDEX IF NOT EXISTS idx_collaborateurs_created_by ON public.collaborateurs(created_by);
CREATE INDEX IF NOT EXISTS idx_collaborateurs_updated_by ON public.collaborateurs(updated_by);

-- Table: collaborateurs_competences
CREATE INDEX IF NOT EXISTS idx_collaborateurs_competences_valide_par ON public.collaborateurs_competences(valide_par);

-- Table: dosimetrie
CREATE INDEX IF NOT EXISTS idx_dosimetrie_created_by ON public.dosimetrie(created_by);
CREATE INDEX IF NOT EXISTS idx_dosimetrie_updated_by ON public.dosimetrie(updated_by);

-- Table: formations
CREATE INDEX IF NOT EXISTS idx_formations_created_by ON public.formations(created_by);
CREATE INDEX IF NOT EXISTS idx_formations_updated_by ON public.formations(updated_by);
CREATE INDEX IF NOT EXISTS idx_formations_validee_par ON public.formations(validee_par);

-- Table: habilitations
CREATE INDEX IF NOT EXISTS idx_habilitations_created_by ON public.habilitations(created_by);
CREATE INDEX IF NOT EXISTS idx_habilitations_updated_by ON public.habilitations(updated_by);

-- Table: tbl_affaires
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_created_by ON public.tbl_affaires(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_pre_planifie_par ON public.tbl_affaires(pre_planifie_par);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_updated_by ON public.tbl_affaires(updated_by);

-- Table: tbl_affaires_bpu
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_bpu_created_by ON public.tbl_affaires_bpu(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_bpu_updated_by ON public.tbl_affaires_bpu(updated_by);

-- Table: tbl_affaires_depenses
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_depenses_created_by ON public.tbl_affaires_depenses(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_depenses_updated_by ON public.tbl_affaires_depenses(updated_by);

-- Table: tbl_affaires_documents
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_documents_uploaded_by ON public.tbl_affaires_documents(uploaded_by);

-- Table: tbl_affaires_lots
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_lots_created_by ON public.tbl_affaires_lots(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_lots_updated_by ON public.tbl_affaires_lots(updated_by);

-- Table: tbl_affaires_pre_planif
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_pre_planif_created_by ON public.tbl_affaires_pre_planif(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_pre_planif_updated_by ON public.tbl_affaires_pre_planif(updated_by);
CREATE INDEX IF NOT EXISTS idx_tbl_affaires_pre_planif_valide_par ON public.tbl_affaires_pre_planif(valide_par);

-- Table: tbl_calendrier_jours
CREATE INDEX IF NOT EXISTS idx_tbl_calendrier_jours_created_by ON public.tbl_calendrier_jours(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_calendrier_jours_updated_by ON public.tbl_calendrier_jours(updated_by);

-- Table: tbl_calendrier_semaine_type
CREATE INDEX IF NOT EXISTS idx_tbl_calendrier_semaine_type_created_by ON public.tbl_calendrier_semaine_type(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_calendrier_semaine_type_updated_by ON public.tbl_calendrier_semaine_type(updated_by);

-- Table: tbl_calendriers
CREATE INDEX IF NOT EXISTS idx_tbl_calendriers_created_by ON public.tbl_calendriers(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_calendriers_updated_by ON public.tbl_calendriers(updated_by);

-- Table: tbl_catalogue_formations
CREATE INDEX IF NOT EXISTS idx_tbl_catalogue_formations_created_by ON public.tbl_catalogue_formations(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_catalogue_formations_updated_by ON public.tbl_catalogue_formations(updated_by);

-- Table: tbl_collaborateur_sites
CREATE INDEX IF NOT EXISTS idx_tbl_collaborateur_sites_created_by ON public.tbl_collaborateur_sites(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_collaborateur_sites_updated_by ON public.tbl_collaborateur_sites(updated_by);

-- Table: tbl_fonctions_metier
CREATE INDEX IF NOT EXISTS idx_tbl_fonctions_metier_created_by ON public.tbl_fonctions_metier(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_fonctions_metier_updated_by ON public.tbl_fonctions_metier(updated_by);

-- Table: tbl_jours_feries
CREATE INDEX IF NOT EXISTS idx_tbl_jours_feries_created_by ON public.tbl_jours_feries(created_by);

-- Table: tbl_partenaire_contacts
CREATE INDEX IF NOT EXISTS idx_tbl_partenaire_contacts_created_by ON public.tbl_partenaire_contacts(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_partenaire_contacts_updated_by ON public.tbl_partenaire_contacts(updated_by);

-- Table: tbl_partenaire_documents
CREATE INDEX IF NOT EXISTS idx_tbl_partenaire_documents_uploaded_by ON public.tbl_partenaire_documents(uploaded_by);

-- Table: tbl_partenaire_sites
CREATE INDEX IF NOT EXISTS idx_tbl_partenaire_sites_created_by ON public.tbl_partenaire_sites(created_by);

-- Table: tbl_partenaires
CREATE INDEX IF NOT EXISTS idx_tbl_partenaires_created_by ON public.tbl_partenaires(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_partenaires_updated_by ON public.tbl_partenaires(updated_by);

-- Table: tbl_plan_previsionnel_formations
CREATE INDEX IF NOT EXISTS idx_tbl_plan_previsionnel_formations_created_by ON public.tbl_plan_previsionnel_formations(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_plan_previsionnel_formations_demandeur_id ON public.tbl_plan_previsionnel_formations(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_tbl_plan_previsionnel_formations_updated_by ON public.tbl_plan_previsionnel_formations(updated_by);
CREATE INDEX IF NOT EXISTS idx_tbl_plan_previsionnel_formations_valide_par ON public.tbl_plan_previsionnel_formations(valide_par);

-- Table: tbl_planification_activites
CREATE INDEX IF NOT EXISTS idx_tbl_planification_activites_created_by ON public.tbl_planification_activites(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_activites_updated_by ON public.tbl_planification_activites(updated_by);

-- Table: tbl_planification_affectations
CREATE INDEX IF NOT EXISTS idx_tbl_planification_affectations_created_by ON public.tbl_planification_affectations(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_affectations_updated_by ON public.tbl_planification_affectations(updated_by);

-- Table: tbl_planification_alertes
CREATE INDEX IF NOT EXISTS idx_tbl_planification_alertes_affaire_id ON public.tbl_planification_alertes(affaire_id);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_alertes_affectation_id ON public.tbl_planification_alertes(affectation_id);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_alertes_collaborateur_id ON public.tbl_planification_alertes(collaborateur_id);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_alertes_resolue_par ON public.tbl_planification_alertes(resolue_par);

-- Table: tbl_planification_coefficients
CREATE INDEX IF NOT EXISTS idx_tbl_planification_coefficients_updated_by ON public.tbl_planification_coefficients(updated_by);

-- Table: tbl_planification_suivi_quotidien
CREATE INDEX IF NOT EXISTS idx_tbl_planification_suivi_quotidien_created_by ON public.tbl_planification_suivi_quotidien(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_suivi_quotidien_updated_by ON public.tbl_planification_suivi_quotidien(updated_by);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_suivi_quotidien_validee_par ON public.tbl_planification_suivi_quotidien(validee_par);

-- Table: tbl_planification_template_taches
CREATE INDEX IF NOT EXISTS idx_tbl_planification_template_taches_tache_precedente_id ON public.tbl_planification_template_taches(tache_precedente_id);

-- Table: tbl_planification_templates
CREATE INDEX IF NOT EXISTS idx_tbl_planification_templates_created_by ON public.tbl_planification_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_planification_templates_updated_by ON public.tbl_planification_templates(updated_by);

-- Table: tbl_site_responsables
CREATE INDEX IF NOT EXISTS idx_tbl_site_responsables_created_by ON public.tbl_site_responsables(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_site_responsables_updated_by ON public.tbl_site_responsables(updated_by);

-- Table: tbl_sites
CREATE INDEX IF NOT EXISTS idx_tbl_sites_created_by ON public.tbl_sites(created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_sites_updated_by ON public.tbl_sites(updated_by);

-- Table: tbl_user_requests
CREATE INDEX IF NOT EXISTS idx_tbl_user_requests_role_attribue_id ON public.tbl_user_requests(role_attribue_id);
CREATE INDEX IF NOT EXISTS idx_tbl_user_requests_traite_par ON public.tbl_user_requests(traite_par);

-- Table: visites_medicales
CREATE INDEX IF NOT EXISTS idx_visites_medicales_created_by ON public.visites_medicales(created_by);
CREATE INDEX IF NOT EXISTS idx_visites_medicales_updated_by ON public.visites_medicales(updated_by);

