import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// GET - Liste des alertes de documents expirants
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const niveau = searchParams.get("niveau"); // expire, expire_j7, expire_j30

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

    let query = clientToUse
      .from("v_alertes_documents_partenaires")
      .select("*");

    if (niveau) {
      query = query.eq("niveau_alerte", niveau);
    }

    const { data, error } = await query.order("date_expiration", { ascending: true });

    if (error) {
      console.error("Erreur récupération alertes:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erreur GET alertes:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

