import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer toutes les dépendances d'une activité
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

    if (!activite_id) {
      return NextResponse.json({ error: "activite_id requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tbl_planification_dependances")
      .select(`
        *,
        activite_precedente:tbl_planification_activites!tbl_planification_dependances_activite_precedente_id_fkey(id, libelle, numero_hierarchique, date_debut_prevue, date_fin_prevue)
      `)
      .eq("activite_id", activite_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erreur lors de la récupération des dépendances:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des dépendances", details: error.message },
        { status: 500 }
      );
    }

    // Transformer les données
    const dependances = (data || []).map((dep) => ({
      ...dep,
      activite_precedente: Array.isArray(dep.activite_precedente) 
        ? dep.activite_precedente[0] || null 
        : dep.activite_precedente || null,
    }));

    return NextResponse.json({ dependances }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer une nouvelle dépendance
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
      activite_precedente_id,
      type_dependance,
      delai_jours = 0,
    } = body;

    if (!activite_id || !activite_precedente_id || !type_dependance) {
      return NextResponse.json(
        { error: "Champs requis manquants: activite_id, activite_precedente_id, type_dependance" },
        { status: 400 }
      );
    }

    // Vérifier qu'on ne crée pas une dépendance vers soi-même
    if (activite_id === activite_precedente_id) {
      return NextResponse.json(
        { error: "Une activité ne peut pas dépendre d'elle-même" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tbl_planification_dependances")
      .insert({
        activite_id,
        activite_precedente_id,
        type_dependance,
        delai_jours: delai_jours || 0,
      })
      .select(`
        *,
        activite_precedente:tbl_planification_activites!tbl_planification_dependances_activite_precedente_id_fkey(id, libelle, numero_hierarchique)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la création de la dépendance:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de la dépendance", details: error.message },
        { status: 500 }
      );
    }

    // Recalculer les dates de l'activité
    await supabase.rpc("recalculer_dates_activite_apres_dependance", {
      p_activite_id: activite_id,
    });

    const dependance = {
      ...data,
      activite_precedente: Array.isArray(data.activite_precedente) 
        ? data.activite_precedente[0] || null 
        : data.activite_precedente || null,
    };

    return NextResponse.json({ dependance }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// DELETE : Supprimer une dépendance
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const activite_id = searchParams.get("activite_id");
    const activite_precedente_id = searchParams.get("activite_precedente_id");

    if (!id && (!activite_id || !activite_precedente_id)) {
      return NextResponse.json(
        { error: "id ou (activite_id + activite_precedente_id) requis" },
        { status: 400 }
      );
    }

    let query = supabase.from("tbl_planification_dependances").delete();

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query
        .eq("activite_id", activite_id)
        .eq("activite_precedente_id", activite_precedente_id);
    }

    const { error } = await query;

    if (error) {
      console.error("Erreur lors de la suppression de la dépendance:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de la dépendance", details: error.message },
        { status: 500 }
      );
    }

    // Recalculer les dates de l'activité si nécessaire
    if (activite_id) {
      await supabase.rpc("recalculer_dates_activite_apres_dependance", {
        p_activite_id: activite_id,
      });
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

