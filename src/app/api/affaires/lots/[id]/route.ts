import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH : Mettre à jour un jalon (lot)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { date_debut_previsionnelle, date_fin_previsionnelle, ...otherUpdates } = body;

    // Construire l'objet de mise à jour
    const updateData: Record<string, unknown> = {
      ...otherUpdates,
      updated_by: user.id,
    };

    if (date_debut_previsionnelle !== undefined) {
      updateData.date_debut_previsionnelle = date_debut_previsionnelle;
    }

    if (date_fin_previsionnelle !== undefined) {
      updateData.date_fin_previsionnelle = date_fin_previsionnelle;
    }

    const { data, error } = await supabase
      .from("tbl_affaires_lots")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour du jalon:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du jalon", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ jalon: data }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

