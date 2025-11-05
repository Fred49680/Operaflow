import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isRHOrAdmin } from "@/lib/auth/rh-check";

// GET - Détails d'une compétence de collaborateur
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
      .from("collaborateurs_competences")
      .select(`
        *,
        competence:competences(id, code, libelle, description, categorie)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erreur récupération compétence:", error);
      return NextResponse.json(
        { error: "Compétence introuvable" },
        { status: 404 }
      );
    }

    const hasRHAccess = await isRHOrAdmin(user.id);
    if (!hasRHAccess) {
      const { data: collab } = await supabase
        .from("collaborateurs")
        .select("user_id")
        .eq("id", data.collaborateur_id)
        .maybeSingle();

      if (!collab || collab.user_id !== user.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur GET compétence:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour une compétence de collaborateur
export async function PATCH(
  request: NextRequest,
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

    const hasRHAccess = await isRHOrAdmin(user.id);
    if (!hasRHAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { niveau, date_obtention, date_expiration, statut } = body;

    const updateData: Record<string, unknown> = {};
    if (niveau !== undefined) updateData.niveau = niveau;
    if (date_obtention !== undefined) updateData.date_obtention = date_obtention || null;
    if (date_expiration !== undefined) updateData.date_expiration = date_expiration || null;
    if (statut !== undefined) updateData.statut = statut;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("collaborateurs_competences")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        competence:competences(id, code, libelle, description, categorie)
      `)
      .single();

    if (error) {
      console.error("Erreur mise à jour compétence:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la mise à jour" },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur PATCH compétence:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une compétence de collaborateur
export async function DELETE(
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

    const hasRHAccess = await isRHOrAdmin(user.id);
    if (!hasRHAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("collaborateurs_competences")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur suppression compétence:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE compétence:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

