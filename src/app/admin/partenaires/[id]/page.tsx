import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
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
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/partenaires/${id}`, {
    headers: {
      Cookie: (await supabase.auth.getSession()).data.session
        ? `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`
        : "",
    },
  });

  if (!response.ok) {
    notFound();
  }

  const partenaire = await response.json();

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

