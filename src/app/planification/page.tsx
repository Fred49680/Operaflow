import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import PlanificationClient from "./planification-client";
import type { ActivitePlanification, AffectationPlanification } from "@/types/planification";

export default async function PlanificationPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Charger les activités planifiées
  const { data: activites } = await supabase
    .from("tbl_planification_activites")
    .select(`
      *,
      affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle),
      lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
      site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
      responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
    `)
    .order("date_debut_prevue", { ascending: true });

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

  // Transformation des données pour gérer les relations Supabase (arrays)
  const activitesTransformed: ActivitePlanification[] = (activites || []).map((act) => ({
    ...act,
    affaire: Array.isArray(act.affaire) ? act.affaire[0] || null : act.affaire || null,
    lot: Array.isArray(act.lot) ? act.lot[0] || null : act.lot || null,
    site: Array.isArray(act.site) ? act.site[0] || null : act.site || null,
    responsable: Array.isArray(act.responsable) ? act.responsable[0] || null : act.responsable || null,
  }));

  const affectationsTransformed: AffectationPlanification[] = (affectations || []).map((aff) => ({
    ...aff,
    activite: Array.isArray(aff.activite) ? aff.activite[0] || null : aff.activite || null,
    collaborateur: Array.isArray(aff.collaborateur) ? aff.collaborateur[0] || null : aff.collaborateur || null,
  }));

  return (
    <PlanificationClient
      activites={activitesTransformed}
      affectations={affectationsTransformed}
      sites={sites || []}
      affaires={affaires || []}
      collaborateurs={collaborateurs || []}
    />
  );
}

