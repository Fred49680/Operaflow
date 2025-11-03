import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST - Générer les jours fériés français pour une plage d'années
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
    const { annee_debut, annee_fin } = body;

    if (!annee_debut || !annee_fin) {
      return NextResponse.json(
        { error: "annee_debut et annee_fin sont requis" },
        { status: 400 }
      );
    }

    if (annee_debut > annee_fin) {
      return NextResponse.json(
        { error: "annee_debut doit être inférieure ou égale à annee_fin" },
        { status: 400 }
      );
    }

    // Appeler la fonction SQL pour générer les jours fériés
    const { data, error } = await supabase.rpc("generer_jours_feries_fr_plage", {
      p_calendrier_id: id,
      p_annee_debut: annee_debut,
      p_annee_fin: annee_fin,
    });

    if (error) {
      console.error("Erreur génération jours fériés:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la génération" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${data} jours fériés générés pour la période ${annee_debut}-${annee_fin}`,
      count: data,
    });
  } catch (error) {
    console.error("Erreur POST génération jours fériés:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

