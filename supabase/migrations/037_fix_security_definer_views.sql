-- Migration 037 : Correction vues SECURITY DEFINER
-- Projet : OperaFlow
-- Description : Retirer SECURITY DEFINER des vues pour sécurité RLS
-- Date : 2025-01-11

-- Les vues PostgreSQL ne peuvent pas avoir SECURITY DEFINER directement,
-- mais Supabase détecte des problèmes de sécurité si elles sont créées
-- par le propriétaire avec des privilèges élevés.
-- Solution : Forcer l'exécution avec les permissions de l'utilisateur appelant

-- Vue v_sites_responsables
DROP VIEW IF EXISTS public.v_sites_responsables CASCADE;
CREATE VIEW public.v_sites_responsables 
WITH (security_invoker = true) AS
SELECT 
    s.site_id,
    s.site_code,
    s.site_label,
    s.parent_site_id,
    s.is_active,
    s.created_at,
    COALESCE(
        json_agg(
            json_build_object(
                'collaborateur_id', sr.collaborateur_id,
                'role_fonctionnel', sr.role_fonctionnel,
                'date_debut', sr.date_debut,
                'date_fin', sr.date_fin
            )
        ) FILTER (WHERE sr.is_active = true AND (sr.date_fin IS NULL OR sr.date_fin >= CURRENT_DATE)),
        '[]'::json
    ) as responsables_actifs
FROM public.tbl_sites s
LEFT JOIN public.tbl_site_responsables sr ON s.site_id = sr.site_id
GROUP BY s.site_id, s.site_code, s.site_label, s.parent_site_id, s.is_active, s.created_at;

-- Vue v_partenaires_dashboard
DROP VIEW IF EXISTS public.v_partenaires_dashboard CASCADE;
CREATE VIEW public.v_partenaires_dashboard 
WITH (security_invoker = true) AS
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

-- Vue v_affaires_dashboard
DROP VIEW IF EXISTS public.v_affaires_dashboard CASCADE;
CREATE VIEW public.v_affaires_dashboard 
WITH (security_invoker = true) AS
SELECT 
    a.id,
    a.numero,
    a.libelle,
    a.client,
    a.statut,
    a.priorite,
    a.date_debut,
    a.date_fin,
    a.montant_total,
    a.type_valorisation,
    a.site_id,
    s.site_label,
    s.site_code,
    c.nom AS charge_affaires_nom,
    c.prenom AS charge_affaires_prenom,
    (a.date_fin - CURRENT_DATE) AS jours_restants,
    CASE 
        WHEN a.date_fin IS NULL THEN NULL
        WHEN a.date_fin < CURRENT_DATE AND a.statut NOT IN ('termine', 'archive') THEN 'en_retard'
        WHEN (a.date_fin - CURRENT_DATE) <= 7 THEN 'echeance_proche'
        ELSE 'a_jour'
    END AS statut_urgence
FROM public.tbl_affaires a
LEFT JOIN public.tbl_sites s ON a.site_id = s.site_id
LEFT JOIN public.collaborateurs c ON a.charge_affaires_id = c.id;

-- Vue v_alertes_formations
DROP VIEW IF EXISTS public.v_alertes_formations CASCADE;
CREATE VIEW public.v_alertes_formations 
WITH (security_invoker = true) AS
SELECT 
    f.id,
    f.collaborateur_id,
    c.nom AS collaborateur_nom,
    c.prenom AS collaborateur_prenom,
    c.email AS collaborateur_email,
    f.libelle AS formation_libelle,
    cf.nom AS catalogue_formation_nom,
    f.date_echeance_validite,
    f.statut,
    CASE 
        WHEN f.date_echeance_validite IS NULL THEN NULL
        WHEN f.date_echeance_validite < CURRENT_DATE THEN 'expiree'
        WHEN f.date_echeance_validite <= CURRENT_DATE + INTERVAL '30 days' THEN 'echeance_imminente'
        WHEN f.date_echeance_validite <= CURRENT_DATE + INTERVAL '90 days' THEN 'echeance_proche'
        ELSE 'a_jour'
    END AS statut_alerte,
    CASE 
        WHEN f.date_echeance_validite IS NULL THEN NULL
        ELSE (f.date_echeance_validite - CURRENT_DATE)::INTEGER
    END AS jours_restants
FROM public.formations f
LEFT JOIN public.collaborateurs c ON f.collaborateur_id = c.id
LEFT JOIN public.catalogue_formations cf ON f.catalogue_formation_id = cf.id
WHERE f.date_echeance_validite IS NOT NULL
    AND f.date_echeance_validite <= CURRENT_DATE + INTERVAL '90 days';

-- Vue v_alertes_echeances
DROP VIEW IF EXISTS public.v_alertes_echeances CASCADE;
CREATE VIEW public.v_alertes_echeances 
WITH (security_invoker = true) AS
SELECT 
  'habilitation' as type_alerte,
  h.id,
  c.id as collaborateur_id,
  c.nom,
  c.prenom,
  c.email,
  h.libelle as libelle_document,
  h.date_expiration,
  CASE 
    WHEN h.date_expiration IS NULL THEN NULL
    WHEN h.date_expiration < CURRENT_DATE THEN 'expiree'
    WHEN h.date_expiration <= CURRENT_DATE + INTERVAL '30 days' THEN 'echeance_proche'
    ELSE 'ok'
  END as statut_alerte,
  (h.date_expiration - CURRENT_DATE)::INTEGER as jours_restants
FROM public.habilitations h
INNER JOIN public.collaborateurs c ON h.collaborateur_id = c.id
WHERE h.statut = 'valide' 
  AND (h.date_expiration IS NULL OR h.date_expiration <= CURRENT_DATE + INTERVAL '30 days')

UNION ALL

SELECT 
  'visite_medicale' as type_alerte,
  vm.id,
  c.id as collaborateur_id,
  c.nom,
  c.prenom,
  c.email,
  'Visite médicale ' || vm.type_visite as libelle_document,
  vm.date_prochaine_visite as date_expiration,
  CASE 
    WHEN vm.date_prochaine_visite IS NULL THEN NULL
    WHEN vm.date_prochaine_visite < CURRENT_DATE THEN 'expiree'
    WHEN vm.date_prochaine_visite <= CURRENT_DATE + INTERVAL '30 days' THEN 'echeance_proche'
    ELSE 'ok'
  END as statut_alerte,
  (vm.date_prochaine_visite - CURRENT_DATE)::INTEGER as jours_restants
FROM public.visites_medicales vm
INNER JOIN public.collaborateurs c ON vm.collaborateur_id = c.id
WHERE vm.statut IN ('apte', 'apte_avec_reserves')
  AND (vm.date_prochaine_visite IS NULL OR vm.date_prochaine_visite <= CURRENT_DATE + INTERVAL '30 days')

UNION ALL

SELECT 
  'competence' as type_alerte,
  cc.id,
  c.id as collaborateur_id,
  c.nom,
  c.prenom,
  c.email,
  comp.libelle as libelle_document,
  cc.date_expiration,
  CASE 
    WHEN cc.date_expiration IS NULL THEN NULL
    WHEN cc.date_expiration < CURRENT_DATE THEN 'expiree'
    WHEN cc.date_expiration <= CURRENT_DATE + INTERVAL '30 days' THEN 'echeance_proche'
    ELSE 'ok'
  END as statut_alerte,
  (cc.date_expiration - CURRENT_DATE)::INTEGER as jours_restants
FROM public.collaborateurs_competences cc
INNER JOIN public.collaborateurs c ON cc.collaborateur_id = c.id
INNER JOIN public.competences comp ON cc.competence_id = comp.id
WHERE cc.statut = 'valide'
  AND (cc.date_expiration IS NULL OR cc.date_expiration <= CURRENT_DATE + INTERVAL '30 days')

UNION ALL

SELECT 
  'contrat_interim' as type_alerte,
  c.id,
  c.id as collaborateur_id,
  c.nom,
  c.prenom,
  c.email,
  'Contrat intérim' as libelle_document,
  c.date_fin_contrat as date_expiration,
  CASE 
    WHEN c.date_fin_contrat IS NULL THEN NULL
    WHEN c.date_fin_contrat < CURRENT_DATE THEN 'expiree'
    WHEN c.date_fin_contrat <= CURRENT_DATE + INTERVAL '15 days' THEN 'echeance_proche'
    ELSE 'ok'
  END as statut_alerte,
  (c.date_fin_contrat - CURRENT_DATE)::INTEGER as jours_restants
FROM public.collaborateurs c
WHERE c.type_contrat = 'Interim'
  AND c.statut = 'actif'
  AND c.date_fin_contrat IS NOT NULL
  AND c.date_fin_contrat <= CURRENT_DATE + INTERVAL '15 days';

-- Vue v_alertes_documents_partenaires
DROP VIEW IF EXISTS public.v_alertes_documents_partenaires CASCADE;
CREATE VIEW public.v_alertes_documents_partenaires 
WITH (security_invoker = true) AS
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

-- Vue v_absences_detail
DROP VIEW IF EXISTS public.v_absences_detail CASCADE;
CREATE VIEW public.v_absences_detail 
WITH (security_invoker = true) AS
SELECT 
  a.*,
  ca.code as catalogue_code,
  ca.libelle as catalogue_libelle,
  ca.categorie as catalogue_categorie,
  c.nom as collaborateur_nom,
  c.prenom as collaborateur_prenom,
  c.email as collaborateur_email,
  valide_n1.nom as valide_n1_nom,
  valide_n1.prenom as valide_n1_prenom,
  valide_rh.nom as valide_rh_nom,
  valide_rh.prenom as valide_rh_prenom
FROM public.absences a
LEFT JOIN public.catalogue_absences ca ON a.catalogue_absence_id = ca.id
LEFT JOIN public.collaborateurs c ON a.collaborateur_id = c.id
LEFT JOIN public.collaborateurs valide_n1 ON valide_n1.user_id = a.valide_par_n1
LEFT JOIN public.collaborateurs valide_rh ON valide_rh.user_id = a.valide_par_rh;

-- Commentaires pour documentation
COMMENT ON VIEW public.v_sites_responsables IS 'Vue des sites avec leurs responsables actifs (security_invoker pour RLS)';
COMMENT ON VIEW public.v_partenaires_dashboard IS 'Vue dashboard des partenaires avec statistiques (security_invoker pour RLS)';
COMMENT ON VIEW public.v_affaires_dashboard IS 'Vue dashboard des affaires avec indicateurs (security_invoker pour RLS)';
COMMENT ON VIEW public.v_alertes_formations IS 'Vue des alertes d''échéance de formations (security_invoker pour RLS)';
COMMENT ON VIEW public.v_alertes_echeances IS 'Vue des alertes d''échéance (habilitations, visites médicales, compétences, contrats intérim) (security_invoker pour RLS)';
COMMENT ON VIEW public.v_alertes_documents_partenaires IS 'Vue des alertes de documents partenaires expirants (security_invoker pour RLS)';
COMMENT ON VIEW public.v_absences_detail IS 'Vue détaillée des absences avec catalogue et validateurs (security_invoker pour RLS)';

