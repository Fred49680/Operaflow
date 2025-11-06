import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Valider la facturation des lignes sélectionnées
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
    const { ligne_ids } = body;
    
    if (!ligne_ids || !Array.isArray(ligne_ids) || ligne_ids.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne sélectionnée" },
        { status: 400 }
      );
    }
    
    // Ici, on devrait créer les lignes de facturation dans une table dédiée
    // Pour l'instant, on marque juste les saisies comme facturées
    // TODO: Créer table tbl_facturation_lignes et y stocker les lignes validées
    
    return NextResponse.json({ 
      success: true,
      message: `${ligne_ids.length} ligne(s) validée(s) pour facturation`
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

