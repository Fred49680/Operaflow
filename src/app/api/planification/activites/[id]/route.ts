import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer une activité spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tbl_planification_activites")
      .select(`
        *,
        affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle, statut),
        lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
        site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
        responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Activité non trouvée" },
          { status: 404 }
        );
      }
      console.error("Erreur lors de la récupération de l'activité:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'activité" },
        { status: 500 }
      );
    }

    // Transformation des données
    const activite = {
      ...data,
      affaire: Array.isArray(data.affaire) ? data.affaire[0] || null : data.affaire || null,
      lot: Array.isArray(data.lot) ? data.lot[0] || null : data.lot || null,
      site: Array.isArray(data.site) ? data.site[0] || null : data.site || null,
      responsable: Array.isArray(data.responsable) ? data.responsable[0] || null : data.responsable || null,
    };

    return NextResponse.json({ activite }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// PATCH : Mettre à jour une activité
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const {
      libelle,
      description,
      date_debut_prevue,
      date_fin_prevue,
      date_debut_reelle,
      date_fin_reelle,
      responsable_id,
      heures_prevues,
      heures_reelles,
      type_horaire,
      coefficient,
      statut,
      pourcentage_avancement,
      activite_precedente_id,
      type_dependance,
      commentaire,
      lot_id,
      site_id,
    } = body;

    // Construire l'objet de mise à jour (seulement les champs fournis)
    const updates: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (libelle !== undefined) updates.libelle = libelle;
    if (description !== undefined) updates.description = description;
    if (date_debut_prevue !== undefined) updates.date_debut_prevue = date_debut_prevue;
    if (date_fin_prevue !== undefined) updates.date_fin_prevue = date_fin_prevue;
    if (date_debut_reelle !== undefined) updates.date_debut_reelle = date_debut_reelle;
    if (date_fin_reelle !== undefined) updates.date_fin_reelle = date_fin_reelle;
    if (responsable_id !== undefined) updates.responsable_id = responsable_id;
    if (heures_prevues !== undefined) updates.heures_prevues = heures_prevues;
    if (heures_reelles !== undefined) updates.heures_reelles = heures_reelles;
    if (type_horaire !== undefined) updates.type_horaire = type_horaire;
    if (coefficient !== undefined) updates.coefficient = coefficient;
    if (statut !== undefined) updates.statut = statut;
    if (pourcentage_avancement !== undefined) updates.pourcentage_avancement = pourcentage_avancement;
    if (activite_precedente_id !== undefined) updates.activite_precedente_id = activite_precedente_id;
    if (type_dependance !== undefined) updates.type_dependance = type_dependance;
    if (commentaire !== undefined) updates.commentaire = commentaire;
    if (lot_id !== undefined) updates.lot_id = lot_id;
    if (site_id !== undefined) updates.site_id = site_id;

    // Validation des dates si fournies
    if (date_debut_prevue && date_fin_prevue && new Date(date_fin_prevue) < new Date(date_debut_prevue)) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tbl_planification_activites")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle),
        lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
        site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
        responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour de l'activité:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'activité", details: error.message },
        { status: 500 }
      );
    }

    // Transformation des données
    const activite = {
      ...data,
      affaire: Array.isArray(data.affaire) ? data.affaire[0] || null : data.affaire || null,
      lot: Array.isArray(data.lot) ? data.lot[0] || null : data.lot || null,
      site: Array.isArray(data.site) ? data.site[0] || null : data.site || null,
      responsable: Array.isArray(data.responsable) ? data.responsable[0] || null : data.responsable || null,
    };

    return NextResponse.json({ activite }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// DELETE : Supprimer une activité
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { error } = await supabase
      .from("tbl_planification_activites")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur lors de la suppression de l'activité:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de l'activité", details: error.message },
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

