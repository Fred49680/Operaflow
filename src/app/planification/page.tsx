import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth/middleware";
import PlanificationClient from "./planification-client";
import type { ActivitePlanification, AffectationPlanification, DependancePlanification } from "@/types/planification";

export default async function PlanificationPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier si l'utilisateur est planificateur ou admin
  const userRoles = await getUserRoles(user.id);
  const isPlanificateur = userRoles.some((role) => 
    role === "Planificateur" || role === "Administrateur" || role === "Responsable d'Activité"
  );

  // Charger les activités planifiées avec hiérarchie et dépendances multiples
  const { data: activites } = await supabase
    .from("tbl_planification_activites")
    .select(`
      *,
      affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle, site_id, statut),
      lot:tbl_affaires_lots(id, numero_lot, libelle_lot, statut),
      site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
      responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom),
      parent:tbl_planification_activites!tbl_planification_activites_parent_id_fkey(id, libelle, numero_hierarchique),
      activite_precedente:tbl_planification_activites!tbl_planification_activites_activite_precedente_id_fkey(id, libelle, numero_hierarchique)
    `)
    .order("numero_hierarchique", { ascending: true })
    .order("ordre_affichage", { ascending: true })
    .order("date_debut_prevue", { ascending: true });

  // Charger les dépendances multiples pour toutes les activités
  const { data: dependances } = await supabase
    .from("tbl_planification_dependances")
    .select(`
      *,
      activite_precedente:tbl_planification_activites!tbl_planification_dependances_activite_precedente_id_fkey(id, libelle, numero_hierarchique, date_debut_prevue, date_fin_prevue)
    `)
    .order("created_at", { ascending: true });

  // Charger les affectations
  const { data: affectations } = await supabase
    .from("tbl_planification_affectations")
    .select(`
      *,
      activite:tbl_planification_activites!tbl_planification_affectations_activite_id_fkey(id, libelle),
      collaborateur:collaborateurs!tbl_planification_affectations_collaborateur_id_fkey(id, nom, prenom, email)
    `)
    .order("date_debut_affectation", { ascending: true });

  // Charger les sites pour les filtres
  const { data: sites } = await supabase
    .from("tbl_sites")
    .select("site_id, site_code, site_label")
    .eq("actif", true)
    .order("site_code");

  // Charger les affaires pour les filtres
  const { data: affaires } = await supabase
    .from("tbl_affaires")
    .select("id, numero, libelle, statut")
    .order("numero");

  // Charger les collaborateurs pour les filtres (responsables)
  const { data: collaborateurs } = await supabase
    .from("collaborateurs")
    .select("id, nom, prenom")
    .eq("statut", "actif")
    .order("nom");

  // Charger les jalons (lots avec est_jalon_gantt = true) pour affichage dans le Gantt
  const { data: jalons } = await supabase
    .from("tbl_affaires_lots")
    .select(`
      *,
      affaire:tbl_affaires!tbl_affaires_lots_affaire_id_fkey(id, numero, libelle, charge_affaires_id)
    `)
    .eq("est_jalon_gantt", true)
    .order("date_debut_previsionnelle", { ascending: true });

  // Charger les calendriers actifs pour le calcul des heures
  const { data: calendriers } = await supabase
    .from("tbl_calendriers")
    .select("id, libelle, site_id, actif")
    .eq("actif", true)
    .order("libelle");

  // Debug: Vérifier si les données sont récupérées
  if (activites && activites.length > 0) {
    console.log(`[Planification] ${activites.length} activité(s) récupérée(s) depuis Supabase`);
  } else {
    console.warn("[Planification] Aucune activité récupérée. Vérifier les RLS et les données.");
  }

  // Transformation des données pour gérer les relations Supabase (arrays)
  const activitesTransformed: ActivitePlanification[] = (activites || []).map((act) => ({
    ...act,
    affaire: Array.isArray(act.affaire) ? act.affaire[0] || null : act.affaire || null,
    lot: Array.isArray(act.lot) ? act.lot[0] || null : act.lot || null,
    site: Array.isArray(act.site) ? act.site[0] || null : act.site || null,
    responsable: Array.isArray(act.responsable) ? act.responsable[0] || null : act.responsable || null,
    parent: Array.isArray(act.parent) ? act.parent[0] || null : act.parent || null,
    activite_precedente: Array.isArray(act.activite_precedente) ? act.activite_precedente[0] || null : act.activite_precedente || null,
  }));

  const affectationsTransformed: AffectationPlanification[] = (affectations || []).map((aff) => ({
    ...aff,
    activite: Array.isArray(aff.activite) ? aff.activite[0] || null : aff.activite || null,
    collaborateur: Array.isArray(aff.collaborateur) ? aff.collaborateur[0] || null : aff.collaborateur || null,
  }));

  // Transformation des dépendances
  const dependancesTransformed: DependancePlanification[] = (dependances || []).map((dep) => ({
    ...dep,
    activite_precedente: Array.isArray(dep.activite_precedente) ? dep.activite_precedente[0] || null : dep.activite_precedente || null,
  }));

  // Associer les dépendances aux activités
  const activitesAvecDependances = activitesTransformed.map((act) => ({
    ...act,
    dependances: dependancesTransformed.filter((dep) => dep.activite_id === act.id),
  }));

  // Transformer les jalons pour gérer les relations Supabase
  const jalonsTransformed = (jalons || []).map((jalon) => ({
    ...jalon,
    affaire: Array.isArray(jalon.affaire) ? jalon.affaire[0] || null : jalon.affaire || null,
  }));

  return (
    <PlanificationClient
      activites={activitesAvecDependances}
      affectations={affectationsTransformed}
      jalons={jalonsTransformed}
      sites={sites || []}
      affaires={affaires || []}
      collaborateurs={collaborateurs || []}
      calendriers={calendriers || []}
      isPlanificateur={isPlanificateur}
      userId={user.id}
    />
  );
}

