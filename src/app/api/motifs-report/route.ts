import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les motifs de report
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    
    const { data, error } = await supabase
      .from("tbl_motifs_report")
      .select("*")
      .order("frequence_utilisation", { ascending: false })
      .order("libelle", { ascending: true });
    
    if (error) {
      console.error("Erreur récupération motifs:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ motifs: data || [] });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer un motif de report
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
    const { libelle, description } = body;
    
    if (!libelle) {
      return NextResponse.json(
        { error: "Le libellé est requis" },
        { status: 400 }
      );
    }
    
    const { data: motif, error } = await supabase
      .from("tbl_motifs_report")
      .insert({
        libelle,
        description: description || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Erreur création motif:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la création" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ motif }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

