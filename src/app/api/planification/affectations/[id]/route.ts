import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH : Mettre à jour une affectation
export async function PATCH(
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
    const {
      date_debut_affectation,
      date_fin_affectation,
      heures_prevues_affectees,
      heures_reelles_saisies,
      type_horaire,
      coefficient,
      statut,
      commentaire,
    } = body;

    const updates: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (date_debut_affectation !== undefined) updates.date_debut_affectation = date_debut_affectation;
    if (date_fin_affectation !== undefined) updates.date_fin_affectation = date_fin_affectation;
    if (heures_prevues_affectees !== undefined) updates.heures_prevues_affectees = heures_prevues_affectees;
    if (heures_reelles_saisies !== undefined) updates.heures_reelles_saisies = heures_reelles_saisies;
    if (type_horaire !== undefined) updates.type_horaire = type_horaire;
    if (coefficient !== undefined) updates.coefficient = coefficient;
    if (statut !== undefined) updates.statut = statut;
    if (commentaire !== undefined) updates.commentaire = commentaire;

    const { data, error } = await supabase
      .from("tbl_planification_affectations")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        activite:tbl_planification_activites!tbl_planification_affectations_activite_id_fkey(id, libelle),
        collaborateur:collaborateurs!tbl_planification_affectations_collaborateur_id_fkey(id, nom, prenom, email)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour", details: error.message },
        { status: 500 }
      );
    }

    // Transformation
    const affectation = {
      ...data,
      activite: Array.isArray(data.activite) ? data.activite[0] || null : data.activite || null,
      collaborateur: Array.isArray(data.collaborateur) ? data.collaborateur[0] || null : data.collaborateur || null,
    };

    return NextResponse.json({ affectation }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// DELETE : Supprimer une affectation
export async function DELETE(
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

    const { error } = await supabase
      .from("tbl_planification_affectations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur lors de la suppression:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression", details: error.message },
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

