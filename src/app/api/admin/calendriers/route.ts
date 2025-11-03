import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET - Liste des calendriers
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name === "Administrateur";
    });

    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const searchParams = new URL(request.url).searchParams;
    const siteId = searchParams.get("site_id");

    let query = supabase
      .from("tbl_calendriers")
      .select(`
        *,
        site:tbl_sites!tbl_calendriers_site_id_fkey(site_id, site_code, site_label)
      `)
      .order("libelle", { ascending: true });

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération calendriers:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    // Transformer les données pour correspondre aux types attendus
    const calendriersWithRelations = (data || []).map((calendrier: {
      site?: Array<{ site_id: string; site_code: string; site_label: string }> | { site_id: string; site_code: string; site_label: string } | null;
      [key: string]: unknown;
    }) => ({
      ...calendrier,
      site: Array.isArray(calendrier.site) && calendrier.site.length > 0
        ? calendrier.site[0]
        : (!Array.isArray(calendrier.site) ? calendrier.site : null),
    }));

    return NextResponse.json({ calendriers: calendriersWithRelations });
  } catch (error) {
    console.error("Erreur GET calendriers:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer un calendrier
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name === "Administrateur";
    });

    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { libelle, description, site_id, actif, annee_reference } = body;

    if (!libelle || !libelle.trim()) {
      return NextResponse.json(
        { error: "Le libellé est requis" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tbl_calendriers")
      .insert({
        libelle: libelle.trim(),
        description: description?.trim() || null,
        site_id: site_id || null,
        actif: actif !== undefined ? actif : true,
        annee_reference: annee_reference || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création calendrier:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la création" },
        { status: 500 }
      );
    }

    return NextResponse.json({ calendrier: data }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST calendriers:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

