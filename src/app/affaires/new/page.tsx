import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import CreateAffaireClient from "./create-affaire-client";

export default async function NewAffairePage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Utiliser le service role key pour bypasser RLS
  const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

  const clientToUse = supabaseAdmin || supabase;

  // Récupérer les sites
  const { data: sites } = await clientToUse
    .from("tbl_sites")
    .select("site_id, site_code, site_label")
    .eq("is_active", true)
    .order("site_code", { ascending: true });

  // Récupérer les collaborateurs pour charge d'affaires
  const { data: collaborateurs } = await clientToUse
    .from("collaborateurs")
    .select("id, nom, prenom")
    .eq("statut", "actif")
    .order("nom", { ascending: true });

  // Récupérer les partenaires (clients uniquement)
  const { data: partenaires } = await clientToUse
    .from("tbl_partenaires")
    .select("id, raison_sociale, type_partenaire, code_interne")
    .or("type_partenaire.eq.client,type_partenaire.eq.mixte")
    .eq("statut", "actif")
    .order("raison_sociale", { ascending: true });

  // Récupérer tous les contacts actifs (seront filtrés côté client par site)
  const { data: contacts } = await clientToUse
    .from("tbl_partenaire_contacts")
    .select(`
      id,
      partenaire_id,
      nom,
      prenom,
      fonction,
      email,
      statut,
      partenaire:tbl_partenaires!tbl_partenaire_contacts_partenaire_id_fkey(
        id,
        raison_sociale,
        sites:tbl_partenaire_sites(
          site_id
        )
      )
    `)
    .eq("statut", "actif");

  return (
    <CreateAffaireClient
      sites={sites || []}
      collaborateurs={collaborateurs || []}
      partenaires={partenaires || []}
      contacts={contacts || []}
    />
  );
}

