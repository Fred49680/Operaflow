import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Incrémenter la fréquence d'utilisation d'un motif
export async function POST(
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
    
    // Utiliser la fonction SQL pour incrémenter
    const { error } = await supabase.rpc("incrementer_frequence_motif", {
      p_motif_id: id,
    });
    
    if (error) {
      console.error("Erreur incrémentation motif:", error);
      // Si la fonction n'existe pas, faire une mise à jour manuelle
      const { error: updateError } = await supabase
        .from("tbl_motifs_report")
        .update({
          frequence_utilisation: supabase.raw("frequence_utilisation + 1"),
        })
        .eq("id", id);
      
      if (updateError) {
        return NextResponse.json(
          { error: "Erreur lors de l'incrémentation" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

