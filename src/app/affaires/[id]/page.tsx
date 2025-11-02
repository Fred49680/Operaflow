import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import AffaireDetailClient from "./affaire-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AffaireDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // Récupérer l'affaire avec toutes ses données
  const { data: affaire, error } = await clientToUse
    .from("tbl_affaires")
    .select(`
      *,
      charge_affaires:collaborateurs!tbl_affaires_charge_affaires_id_fkey(id, nom, prenom),
      site:tbl_sites!tbl_affaires_site_id_fkey(site_id, site_code, site_label),
      partenaire:tbl_partenaires!tbl_affaires_partenaire_id_fkey(id, raison_sociale, type_partenaire),
      contact:tbl_partenaire_contacts!tbl_affaires_contact_id_fkey(id, nom, prenom, fonction, email),
      bpu:tbl_affaires_bpu(*),
      depenses:tbl_affaires_depenses(*),
      lots:tbl_affaires_lots(*),
      pre_planif:tbl_affaires_pre_planif(*),
      documents:tbl_affaires_documents(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !affaire) {
    console.error("Erreur récupération affaire:", error);
    notFound();
  }

  // Récupérer les sites et collaborateurs pour la modification
  const { data: sites } = await clientToUse
    .from("tbl_sites")
    .select("site_id, site_code, site_label")
    .eq("is_active", true)
    .order("site_code", { ascending: true });

  const { data: collaborateurs } = await clientToUse
    .from("collaborateurs")
    .select("id, nom, prenom")
    .eq("statut", "actif")
    .order("nom", { ascending: true });

  // Récupérer les partenaires pour la modification
  const { data: partenaires } = await clientToUse
    .from("tbl_partenaires")
    .select("id, raison_sociale, type_partenaire, code_interne")
    .or("type_partenaire.eq.client,type_partenaire.eq.mixte")
    .eq("statut", "actif")
    .order("raison_sociale", { ascending: true });

  // Transformer les données pour correspondre aux types attendus
  const affaireWithRelations = affaire ? {
    ...affaire,
    partenaire: Array.isArray(affaire.partenaire) && affaire.partenaire.length > 0
      ? affaire.partenaire[0]
      : (!Array.isArray(affaire.partenaire) ? affaire.partenaire : null),
    contact: Array.isArray(affaire.contact) && affaire.contact.length > 0
      ? affaire.contact[0]
      : (!Array.isArray(affaire.contact) ? affaire.contact : null),
    site: Array.isArray(affaire.site) && affaire.site.length > 0
      ? affaire.site[0]
      : (!Array.isArray(affaire.site) ? affaire.site : null),
  } : null;

  return (
    <AffaireDetailClient
      affaire={affaireWithRelations}
      sites={sites || []}
      collaborateurs={collaborateurs || []}
      partenaires={partenaires || []}
    />
  );
}

