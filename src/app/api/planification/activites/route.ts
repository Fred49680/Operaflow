import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer toutes les activités (avec filtres optionnels)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const affaire_id = searchParams.get("affaire_id");
    const site_id = searchParams.get("site_id");
    const statut = searchParams.get("statut");

    // Construction de la requête
    let query = supabase
      .from("tbl_planification_activites")
      .select(`
        *,
        affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle, statut),
        lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
        site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
        responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
      `)
      .order("date_debut_prevue", { ascending: true });

    // Application des filtres
    if (affaire_id) {
      query = query.eq("affaire_id", affaire_id);
    }
    if (site_id) {
      query = query.eq("site_id", site_id);
    }
    if (statut) {
      query = query.eq("statut", statut);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur lors de la récupération des activités:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des activités" },
        { status: 500 }
      );
    }

    // Transformation des données (gérer les arrays Supabase)
    const activites = (data || []).map((act) => ({
      ...act,
      affaire: Array.isArray(act.affaire) ? act.affaire[0] || null : act.affaire || null,
      lot: Array.isArray(act.lot) ? act.lot[0] || null : act.lot || null,
      site: Array.isArray(act.site) ? act.site[0] || null : act.site || null,
      responsable: Array.isArray(act.responsable) ? act.responsable[0] || null : act.responsable || null,
    }));

    return NextResponse.json({ activites }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer une nouvelle activité
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const {
      affaire_id,
      lot_id,
      site_id,
      numero_activite,
      libelle,
      description,
      date_debut_prevue,
      date_fin_prevue,
      responsable_id,
      heures_prevues,
      type_horaire,
      coefficient,
      activite_precedente_id,
      type_dependance,
      commentaire,
      // Nouveaux champs
      parent_id,
      duree_jours_ouvres,
      calcul_auto_date_fin,
    } = body;

    // Validation des champs requis
    if (!affaire_id || !libelle || !date_debut_prevue || !date_fin_prevue) {
      return NextResponse.json(
        { error: "Champs requis manquants: affaire_id, libelle, date_debut_prevue, date_fin_prevue" },
        { status: 400 }
      );
    }

    // Validation des dates
    if (new Date(date_fin_prevue) < new Date(date_debut_prevue)) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début" },
        { status: 400 }
      );
    }

    // Insertion dans la base de données
    const { data, error } = await supabase
      .from("tbl_planification_activites")
      .insert({
        affaire_id,
        lot_id: lot_id || null,
        site_id: site_id || null,
        numero_activite: numero_activite || null,
        libelle,
        description: description || null,
        date_debut_prevue,
        date_fin_prevue,
        responsable_id: responsable_id || null,
        heures_prevues: heures_prevues || 0,
        type_horaire: type_horaire || "jour",
        coefficient: coefficient || 1.0,
        activite_precedente_id: activite_precedente_id || null,
        type_dependance: type_dependance || null,
        commentaire: commentaire || null,
        // Nouveaux champs
        parent_id: parent_id || null,
        duree_jours_ouvres: duree_jours_ouvres || null,
        calcul_auto_date_fin: calcul_auto_date_fin || false,
        created_by: user.id,
      })
      .select(`
        *,
        affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle),
        lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
        site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
        responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la création de l'activité:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'activité", details: error.message },
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

    return NextResponse.json({ activite }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

