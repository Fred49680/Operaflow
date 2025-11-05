import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isRHOrAdmin } from "@/lib/auth/rh-check";

// GET - Liste des compétences d'un collaborateur
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const collaborateurId = searchParams.get("collaborateur_id");

    if (!collaborateurId) {
      return NextResponse.json(
        { error: "collaborateur_id est requis" },
        { status: 400 }
      );
    }

    const hasRHAccess = await isRHOrAdmin(user.id);

    // Vérifier que l'utilisateur peut voir ce collaborateur
    if (!hasRHAccess) {
      const { data: collab } = await supabase
        .from("collaborateurs")
        .select("user_id")
        .eq("id", collaborateurId)
        .maybeSingle();

      if (!collab || collab.user_id !== user.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("collaborateurs_competences")
      .select(`
        *,
        competence:competences(id, code, libelle, description, categorie)
      `)
      .eq("collaborateur_id", collaborateurId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur récupération compétences:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erreur GET compétences:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Ajouter une compétence à un collaborateur
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const hasRHAccess = await isRHOrAdmin(user.id);
    if (!hasRHAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { collaborateur_id, competence_id, niveau, statut } = body;

    if (!collaborateur_id || !competence_id) {
      return NextResponse.json(
        { error: "collaborateur_id et competence_id sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si la compétence existe déjà pour ce collaborateur
    const { data: existing } = await supabase
      .from("collaborateurs_competences")
      .select("id")
      .eq("collaborateur_id", collaborateur_id)
      .eq("competence_id", competence_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Cette compétence est déjà associée à ce collaborateur" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("collaborateurs_competences")
      .insert({
        collaborateur_id,
        competence_id,
        niveau: niveau || "base",
        statut: statut || "valide",
        valide_par: user.id,
        date_validation: new Date().toISOString(),
      })
      .select(`
        *,
        competence:competences(id, code, libelle, description, categorie)
      `)
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
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

