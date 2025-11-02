import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import PartenairesClient from "./partenaires-client";

export default async function PartenairesPage() {
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

  // Récupérer les partenaires
  const { data: partenaires, error } = await clientToUse
    .from("tbl_partenaires")
    .select("*")
    .order("raison_sociale", { ascending: true });

  if (error) {
    console.error("Erreur récupération partenaires:", error);
  }

  return (
    <PartenairesClient
      initialPartenaires={partenaires || []}
    />
  );
}

