import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST - Lier un site à un partenaire
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier les droits
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
        "Chargé d'Affaires",
      ].includes(role.name);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { site_id } = body;

    if (!site_id) {
      return NextResponse.json(
        { error: "site_id est requis" },
        { status: 400 }
      );
    }

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

    // Vérifier si la liaison existe déjà
    const { data: existing } = await clientToUse
      .from("tbl_partenaire_sites")
      .select("id")
      .eq("partenaire_id", id)
      .eq("site_id", site_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ce site est déjà lié à ce partenaire" },
        { status: 400 }
      );
    }

    // Créer la liaison
    const { data: link, error } = await clientToUse
      .from("tbl_partenaire_sites")
      .insert({
        partenaire_id: id,
        site_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création liaison site:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error("Erreur POST site partenaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

