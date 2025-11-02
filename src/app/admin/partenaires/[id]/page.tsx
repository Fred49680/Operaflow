import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Partenaire } from "@/types/partenaires";
import PartenaireDetailClient from "./partenaire-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PartenaireDetailPage({ params }: PageProps) {
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

  // Récupérer le partenaire avec toutes ses données
  const { data: partenaire, error: partenaireError } = await clientToUse
    .from("tbl_partenaires")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (partenaireError || !partenaire) {
    console.error("Erreur récupération partenaire:", partenaireError);
    notFound();
  }

  // Récupérer les contacts
  const { data: contacts } = await clientToUse
    .from("tbl_partenaire_contacts")
    .select("*")
    .eq("partenaire_id", id)
    .order("est_contact_principal", { ascending: false })
    .order("nom", { ascending: true });

  // Récupérer les documents
  const { data: documents } = await clientToUse
    .from("tbl_partenaire_documents")
    .select(`
      *,
      site:tbl_sites!tbl_partenaire_documents_site_id_fkey(site_id, site_code, site_label)
    `)
    .eq("partenaire_id", id)
    .order("date_expiration", { ascending: true, nullsFirst: false });

  // Récupérer les sites liés
  const { data: sitesLinks } = await clientToUse
    .from("tbl_partenaire_sites")
    .select(`
      site_id,
      site:tbl_sites!tbl_partenaire_sites_site_id_fkey(site_id, site_code, site_label)
    `)
    .eq("partenaire_id", id);

  const partenaireWithRelations: Partenaire = {
    ...partenaire,
    contacts: contacts || [],
    documents: documents || [],
    sites: sitesLinks?.map((sl) => sl.site).filter(Boolean) || [],
  };

  // Récupérer les sites pour le formulaire
  const { data: sites } = await clientToUse
    .from("tbl_sites")
    .select("site_id, site_code, site_label")
    .eq("is_active", true)
    .order("site_code", { ascending: true });

  return (
    <PartenaireDetailClient
      partenaire={partenaireWithRelations}
      sites={sites || []}
    />
  );
}

