import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Récupérer un partenaire avec toutes ses données
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

    // Récupérer le partenaire avec ses relations
    const { data: partenaire, error: partenaireError } = await clientToUse
      .from("tbl_partenaires")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (partenaireError || !partenaire) {
      return NextResponse.json(
        { error: "Partenaire non trouvé" },
        { status: 404 }
      );
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

    return NextResponse.json({
      ...partenaire,
      contacts: contacts || [],
      documents: documents || [],
      sites: sitesLinks?.map((sl) => sl.site).filter(Boolean) || [],
    });
  } catch (error) {
    console.error("Erreur GET partenaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour un partenaire
export async function PATCH(
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
      ].includes(role.name);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contacts: _contacts, documents: _documents, sites: _sites, ...partenaireData } = body;

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

    // Mettre à jour le partenaire
    const { data, error: updateError } = await clientToUse
      .from("tbl_partenaires")
      .update({
        ...partenaireData,
        updated_by: user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Erreur mise à jour partenaire:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur PATCH partenaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

