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

