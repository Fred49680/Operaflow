import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les activités terrain
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    
    const searchParams = new URL(request.url).searchParams;
    const affaireId = searchParams.get("affaire_id");
    const statut = searchParams.get("statut");
    const aRattacher = searchParams.get("a_rattacher");
    
    let query = supabase
      .from("tbl_activites_terrain")
      .select(`
        *,
        affaire:tbl_affaires!tbl_activites_terrain_affaire_id_fkey(id, numero, libelle, type_valorisation)
      `)
      .order("created_at", { ascending: false });
    
    if (affaireId) {
      query = query.eq("affaire_id", affaireId);
    }
    
    if (statut) {
      query = query.eq("statut", statut);
    }
    
    if (aRattacher === "true") {
      query = query.eq("a_rattacher", true);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Erreur récupération activités terrain:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ activites: data || [] });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer une activité terrain
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
      libelle,
      affaire_id,
      ot,
      tranche,
      systeme_elementaire,
      type_activite,
      type_horaire,
      commentaire,
      a_rattacher = false,
      statut = "planifiee",
    } = body;
    
    if (!libelle || !affaire_id) {
      return NextResponse.json(
        { error: "Libellé et affaire_id sont requis" },
        { status: 400 }
      );
    }
    
    const { data: activite, error } = await supabase
      .from("tbl_activites_terrain")
      .insert({
        libelle,
        affaire_id,
        ot: ot || null,
        tranche: tranche !== undefined && tranche !== null ? tranche : null,
        systeme_elementaire: systeme_elementaire || null,
        type_activite: type_activite || null,
        type_horaire: type_horaire || null,
        commentaire: commentaire || null,
        a_rattacher,
        statut,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Erreur création activité terrain:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la création" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ activite }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

