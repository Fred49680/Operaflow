import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET - Récupérer la semaine type d'un calendrier
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

    const { data, error } = await supabase
      .from("tbl_calendrier_semaine_type")
      .select("*")
      .eq("calendrier_id", id)
      .order("jour_semaine", { ascending: true });

    if (error) {
      console.error("Erreur récupération semaine type:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json({ semaine_type: data || [] });
  } catch (error) {
    console.error("Erreur GET semaine type:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour la semaine type
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
    const { semaine_type } = body; // Array de { jour_semaine, heures_travail, type_jour }

    if (!Array.isArray(semaine_type)) {
      return NextResponse.json(
        { error: "semaine_type doit être un tableau" },
        { status: 400 }
      );
    }

    // Supprimer la semaine type existante
    await supabase
      .from("tbl_calendrier_semaine_type")
      .delete()
      .eq("calendrier_id", id);

    // Insérer la nouvelle semaine type
    const joursToInsert = semaine_type.map((jour: {
      jour_semaine: number;
      heures_travail: number;
      type_jour: string;
    }) => ({
      calendrier_id: id,
      jour_semaine: jour.jour_semaine,
      heures_travail: jour.heures_travail || 0,
      type_jour: jour.type_jour || "ouvre",
      created_by: user.id,
      updated_by: user.id,
    }));

    const { data, error } = await supabase
      .from("tbl_calendrier_semaine_type")
      .insert(joursToInsert)
      .select();

    if (error) {
      console.error("Erreur sauvegarde semaine type:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    return NextResponse.json({ semaine_type: data });
  } catch (error) {
    console.error("Erreur POST semaine type:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

