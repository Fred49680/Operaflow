import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth/middleware";
import SuiviQuotidienClient from "./suivi-quotidien-client";
import type { ActivitePlanification } from "@/types/planification";

export default async function SuiviQuotidienPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier les rôles (Chef de Chantier, Conducteur, Planificateur, Admin)
  const userRoles = await getUserRoles(user.id);
  const hasAccesSuivi = userRoles.some((role) => 
    role === "Chef de Chantier" || 
    role === "Conducteur de Travaux" || 
    role === "Planificateur" || 
    role === "Administrateur" ||
    role === "Responsable d'Activité"
  );

  if (!hasAccesSuivi) {
    redirect("/dashboard");
  }

  // Charger les activités avec leurs relations
  const { data: activites } = await supabase
    .from("tbl_planification_activites")
    .select(`
      *,
      affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle, site_id),
      site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
      responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
    `)
    .in("statut", ["planifiee", "lancee", "suspendue", "reportee", "prolongee"])
    .order("date_debut_prevue", { ascending: true });

  // Charger les suivis quotidiens existants
  const { data: suivis } = await supabase
    .from("tbl_planification_suivi_quotidien")
    .select(`
      *,
      activite:tbl_planification_activites!tbl_planification_suivi_quotidien_activite_id_fkey(id, libelle),
      collaborateur:collaborateurs!tbl_planification_suivi_quotidien_collaborateur_id_fkey(id, nom, prenom)
    `)
    .order("date_journee", { ascending: false })
    .limit(100);

  // Charger les sites pour filtres
  const { data: sites } = await supabase
    .from("tbl_sites")
    .select("site_id, site_code, site_label")
    .eq("actif", true)
    .order("site_code");

  return (
    <SuiviQuotidienClient
      activites={(activites || []) as ActivitePlanification[]}
      suivis={suivis || []}
      sites={sites || []}
      userId={user.id}
      userRoles={userRoles}
    />
  );
}

