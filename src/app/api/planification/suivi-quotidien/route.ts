import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les suivis quotidiens
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activiteId = searchParams.get("activite_id");
    const collaborateurId = searchParams.get("collaborateur_id");
    const dateDebut = searchParams.get("date_debut");
    const dateFin = searchParams.get("date_fin");

    let query = supabase
      .from("tbl_planification_suivi_quotidien")
      .select(`
        *,
        activite:tbl_planification_activites!tbl_planification_suivi_quotidien_activite_id_fkey(id, libelle),
        collaborateur:collaborateurs!tbl_planification_suivi_quotidien_collaborateur_id_fkey(id, nom, prenom)
      `)
      .order("date_journee", { ascending: false });

    if (activiteId) {
      query = query.eq("activite_id", activiteId);
    }
    if (collaborateurId) {
      query = query.eq("collaborateur_id", collaborateurId);
    }
    if (dateDebut) {
      query = query.gte("date_journee", dateDebut);
    }
    if (dateFin) {
      query = query.lte("date_journee", dateFin);
    }

    const { data: suivis, error } = await query;

    if (error) {
      console.error("Erreur lors de la récupération des suivis:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des suivis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ suivis: suivis || [] }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer un suivi quotidien
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
      affectation_id,
      collaborateur_id,
      date_journee,
      heure_debut,
      heure_fin,
      duree_pause_minutes,
      heures_reelles,
      type_horaire,
      pourcentage_avancement_journee,
      commentaire,
    } = body;

    if (!activite_id || !collaborateur_id || !date_journee) {
      return NextResponse.json(
        { error: "activite_id, collaborateur_id et date_journee sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si un suivi existe déjà pour ce jour/collab/activité
    const { data: existing } = await supabase
      .from("tbl_planification_suivi_quotidien")
      .select("id")
      .eq("activite_id", activite_id)
      .eq("collaborateur_id", collaborateur_id)
      .eq("date_journee", date_journee)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Un suivi existe déjà pour cette activité, ce collaborateur et cette date" },
        { status: 409 }
      );
    }

    // Créer le suivi
    const { data: suivi, error } = await supabase
      .from("tbl_planification_suivi_quotidien")
      .insert({
        activite_id,
        affectation_id: affectation_id || null,
        collaborateur_id,
        date_journee,
        heure_debut: heure_debut || null,
        heure_fin: heure_fin || null,
        duree_pause_minutes: duree_pause_minutes || 0,
        heures_reelles: heures_reelles || 0,
        type_horaire: type_horaire || "jour",
        pourcentage_avancement_journee: pourcentage_avancement_journee || 0,
        commentaire: commentaire || null,
        created_by: user.id,
      })
      .select(`
        *,
        activite:tbl_planification_activites!tbl_planification_suivi_quotidien_activite_id_fkey(id, libelle),
        collaborateur:collaborateurs!tbl_planification_suivi_quotidien_collaborateur_id_fkey(id, nom, prenom)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la création du suivi:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création du suivi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ suivi }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

