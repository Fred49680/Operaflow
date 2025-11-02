import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer un template spécifique
export async function GET(
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

    const { id } = await params;
    
    const { data: template, error } = await supabase
      .from("tbl_planification_templates")
      .select(`
        *,
        taches:tbl_planification_template_taches(*)
      `)
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// PATCH : Modifier un template
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

    const { id } = await params;
    const body = await request.json();
    const { nom_template, description, categorie, actif } = body;

    const updates: {
      nom_template?: string;
      description?: string | null;
      categorie?: string | null;
      actif?: boolean;
      updated_by: string;
      updated_at: string;
    } = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (nom_template !== undefined) updates.nom_template = nom_template;
    if (description !== undefined) updates.description = description || null;
    if (categorie !== undefined) updates.categorie = categorie || null;
    if (actif !== undefined) updates.actif = actif;

    const { data: template, error } = await supabase
      .from("tbl_planification_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// DELETE : Supprimer un template
export async function DELETE(
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

    const { id } = await params;

    const { error } = await supabase
      .from("tbl_planification_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur lors de la suppression:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

