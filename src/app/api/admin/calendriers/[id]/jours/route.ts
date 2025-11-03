import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET - Liste des jours d'un calendrier
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = new URL(request.url).searchParams;
    const annee = searchParams.get("annee");
    const mois = searchParams.get("mois");

    let query = supabase
      .from("tbl_calendrier_jours")
      .select("*")
      .eq("calendrier_id", id)
      .order("date_jour", { ascending: true });

    if (annee) {
      query = query.eq("EXTRACT(YEAR FROM date_jour)", annee);
    }
    if (mois) {
      query = query.eq("EXTRACT(MONTH FROM date_jour)", mois);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération jours:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json({ jours: data || [] });
  } catch (error) {
    console.error("Erreur GET jours calendrier:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour un jour
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { date_jour, type_jour, heures_travail, libelle, est_recurrent } = body;

    if (!date_jour || !type_jour) {
      return NextResponse.json(
        { error: "La date et le type de jour sont requis" },
        { status: 400 }
      );
    }

    // Utiliser upsert pour créer ou mettre à jour
    const { data, error } = await supabase
      .from("tbl_calendrier_jours")
      .upsert({
        calendrier_id: id,
        date_jour,
        type_jour,
        heures_travail: heures_travail || 0,
        libelle: libelle?.trim() || null,
        est_recurrent: est_recurrent || false,
        updated_by: user.id,
      }, {
        onConflict: "calendrier_id,date_jour",
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création/mise à jour jour:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la création" },
        { status: 500 }
      );
    }

    return NextResponse.json({ jour: data }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST jours calendrier:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

