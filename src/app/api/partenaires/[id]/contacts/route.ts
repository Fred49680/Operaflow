import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Liste des contacts d'un partenaire
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
      .from("tbl_partenaire_contacts")
      .select("*")
      .eq("partenaire_id", id)
      .order("est_contact_principal", { ascending: false })
      .order("nom", { ascending: true });

    if (error) {
      console.error("Erreur récupération contacts:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erreur GET contacts:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer un contact
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

    const { data: contact, error: contactError } = await clientToUse
      .from("tbl_partenaire_contacts")
      .insert({
        ...body,
        partenaire_id: id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (contactError) {
      console.error("Erreur création contact:", contactError);
      return NextResponse.json(
        { error: contactError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Erreur POST contact:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

