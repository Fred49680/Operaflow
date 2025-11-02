import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import AlertesClient from "./alertes-client";

export default async function AlertesPage() {
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

  // Récupérer les alertes depuis la vue
  const { data: alertes, error } = await clientToUse
    .from("v_alertes_documents_partenaires")
    .select("*")
    .order("date_expiration", { ascending: true });

  if (error) {
    console.error("Erreur récupération alertes:", error);
  }

  return (
    <AlertesClient
      initialAlertes={alertes || []}
    />
  );
}

