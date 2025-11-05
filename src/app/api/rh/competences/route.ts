import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Liste des compétences disponibles
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("competences")
      .select("id, code, libelle, description, categorie, niveau_requis")
      .order("categorie", { ascending: true })
      .order("libelle", { ascending: true });

    if (error) {
      console.error("Erreur récupération compétences:", error);
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

// POST - Créer une nouvelle compétence
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { libelle, code, description, categorie } = body;

    if (!libelle) {
      return NextResponse.json(
        { error: "libelle est requis" },
        { status: 400 }
      );
    }

    // Vérifier si une compétence avec le même libellé existe déjà
    const { data: existing } = await supabase
      .from("competences")
      .select("id")
      .eq("libelle", libelle.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Une compétence avec ce libellé existe déjà", competence: existing },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("competences")
      .insert({
        libelle: libelle.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        categorie: categorie?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création compétence:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la création" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erreur POST compétence:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

