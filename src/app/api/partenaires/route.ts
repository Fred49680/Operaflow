import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// GET - Liste des partenaires
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
    const type = searchParams.get("type");
    const statut = searchParams.get("statut");
    const search = searchParams.get("search");

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
      .from("tbl_partenaires")
      .select("*");

    if (type) query = query.eq("type_partenaire", type);
    if (statut) query = query.eq("statut", statut);
    if (search) {
      query = query.or(`raison_sociale.ilike.%${search}%,code_interne.ilike.%${search}%,siret.ilike.%${search}%`);
    }

    const { data, error } = await query.order("raison_sociale", { ascending: true });

    if (error) {
      console.error("Erreur récupération partenaires:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erreur GET partenaires:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer un partenaire
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier les droits (RH/Admin)
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const hasAccess = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name && [
        "Administrateur",
        "Administratif RH",
        "RH",
        "Responsable d'Activité",
      ].includes(role.name);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();

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

    const { data: partenaire, error: partenaireError } = await clientToUse
      .from("tbl_partenaires")
      .insert({
        ...body,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (partenaireError) {
      console.error("Erreur création partenaire:", partenaireError);
      return NextResponse.json(
        { error: partenaireError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(partenaire, { status: 201 });
  } catch (error) {
    console.error("Erreur POST partenaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

