import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les compétences requises d'une activité
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("activites_competences_requises")
      .select(`
        id,
        activite_id,
        competence_id,
        niveau_requis,
        est_obligatoire,
        competences (
          id,
          code,
          libelle,
          description,
          categorie,
          niveau_requis as niveau_competence
        )
      `)
      .eq("activite_id", id)
      .order("est_obligatoire", { ascending: false });

    if (error) {
      console.error("Erreur récupération compétences requises:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json({ competences: data || [] });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Ajouter une compétence requise à une activité
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { competence_id, niveau_requis = "base", est_obligatoire = true } = body;

    if (!competence_id) {
      return NextResponse.json(
        { error: "competence_id est requis" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("activites_competences_requises")
      .insert({
        activite_id: id,
        competence_id,
        niveau_requis,
        est_obligatoire,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(`
        id,
        activite_id,
        competence_id,
        niveau_requis,
        est_obligatoire,
        competences (
          id,
          code,
          libelle,
          description,
          categorie
        )
      `)
      .single();

    if (error) {
      console.error("Erreur ajout compétence requise:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de l'ajout" },
        { status: 500 }
      );
    }

    return NextResponse.json({ competence: data });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// DELETE : Supprimer une compétence requise
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id est requis" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("activites_competences_requises")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur suppression compétence requise:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

