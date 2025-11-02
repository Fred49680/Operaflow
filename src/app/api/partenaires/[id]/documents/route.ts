import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Liste des documents d'un partenaire
export async function GET(
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

    const { data, error } = await clientToUse
      .from("tbl_partenaire_documents")
      .select(`
        *,
        site:tbl_sites!tbl_partenaire_documents_site_id_fkey(site_id, site_code, site_label)
      `)
      .eq("partenaire_id", id)
      .order("date_expiration", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Erreur récupération documents:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erreur GET documents:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer un document
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

    const { data: document, error: documentError } = await clientToUse
      .from("tbl_partenaire_documents")
      .insert({
        ...body,
        partenaire_id: id,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (documentError) {
      console.error("Erreur création document:", documentError);
      return NextResponse.json(
        { error: documentError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Erreur POST document:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

