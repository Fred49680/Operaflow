import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer toutes les affectations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activite_id = searchParams.get("activite_id");
    const collaborateur_id = searchParams.get("collaborateur_id");

    let query = supabase
      .from("tbl_planification_affectations")
      .select(`
        *,
        activite:tbl_planification_activites!tbl_planification_affectations_activite_id_fkey(id, libelle),
        collaborateur:collaborateurs!tbl_planification_affectations_collaborateur_id_fkey(id, nom, prenom, email)
      `)
      .order("date_debut_affectation", { ascending: true });

    if (activite_id) {
      query = query.eq("activite_id", activite_id);
    }
    if (collaborateur_id) {
      query = query.eq("collaborateur_id", collaborateur_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur lors de la récupération des affectations:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des affectations" },
        { status: 500 }
      );
    }

    // Transformation des données
    const affectations = (data || []).map((aff: any) => ({
      ...aff,
      activite: Array.isArray(aff.activite) ? aff.activite[0] || null : aff.activite || null,
      collaborateur: Array.isArray(aff.collaborateur) ? aff.collaborateur[0] || null : aff.collaborateur || null,
    }));

    return NextResponse.json({ affectations }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer une affectation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const {
      activite_id,
      collaborateur_id,
      date_debut_affectation,
      date_fin_affectation,
      heures_prevues_affectees,
      type_horaire,
      coefficient,
      commentaire,
    } = body;

    // Validation
    if (!activite_id || !collaborateur_id || !date_debut_affectation || !date_fin_affectation) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 }
      );
    }

    if (new Date(date_fin_affectation) < new Date(date_debut_affectation)) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tbl_planification_affectations")
      .insert({
        activite_id,
        collaborateur_id,
        date_debut_affectation,
        date_fin_affectation,
        heures_prevues_affectees: heures_prevues_affectees || 0,
        type_horaire: type_horaire || "jour",
        coefficient: coefficient || 1.0,
        commentaire: commentaire || null,
        created_by: user.id,
      })
      .select(`
        *,
        activite:tbl_planification_activites!tbl_planification_affectations_activite_id_fkey(id, libelle),
        collaborateur:collaborateurs!tbl_planification_affectations_collaborateur_id_fkey(id, nom, prenom, email)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la création de l'affectation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'affectation", details: error.message },
        { status: 500 }
      );
    }

    // Transformation
    const affectation = {
      ...data,
      activite: Array.isArray(data.activite) ? data.activite[0] || null : data.activite || null,
      collaborateur: Array.isArray(data.collaborateur) ? data.collaborateur[0] || null : data.collaborateur || null,
    };

    return NextResponse.json({ affectation }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

