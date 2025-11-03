import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import CalendriersClient from "./calendriers-client";

export default async function CalendriersPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier que l'utilisateur est admin
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = userRoles?.some((ur) => {
    const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return role?.name === "Administrateur";
  });

  if (!isAdmin) {
    redirect("/unauthorized");
  }

  // Récupérer les calendriers
  const { data: calendriers } = await supabase
    .from("tbl_calendriers")
    .select(`
      *,
      site:tbl_sites!tbl_calendriers_site_id_fkey(site_id, site_code, site_label)
    `)
    .order("libelle", { ascending: true });

  // Transformer les données
  const calendriersWithRelations = (calendriers || []).map((calendrier: {
    site?: Array<{ site_id: string; site_code: string; site_label: string }> | { site_id: string; site_code: string; site_label: string } | null;
    [key: string]: unknown;
  }) => ({
    ...calendrier,
    site: Array.isArray(calendrier.site) && calendrier.site.length > 0
      ? calendrier.site[0]
      : (!Array.isArray(calendrier.site) ? calendrier.site : null),
  }));

  // Récupérer les sites pour le formulaire
  const { data: sites } = await supabase
    .from("tbl_sites")
    .select("site_id, site_code, site_label")
    .order("site_label", { ascending: true });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Catalogue Calendriers
          </h1>
          <p className="text-lg text-secondary">
            Gérez les calendriers personnalisés par site pour définir les jours ouvrés, fériés et heures travaillées
          </p>
        </div>

        <CalendriersClient 
          calendriers={calendriersWithRelations || []}
          sites={sites || []}
        />
      </div>
    </div>
  );
}

