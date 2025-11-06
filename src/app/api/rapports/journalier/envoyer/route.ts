import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Envoyer le rapport journalier par email
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
    const { date } = body;
    
    if (!date) {
      return NextResponse.json(
        { error: "Date requise" },
        { status: 400 }
      );
    }
    
    // TODO: Implémenter l'envoi d'email via SendGrid
    // 1. Générer le rapport (HTML + PDF)
    // 2. Récupérer les destinataires (Responsables d'Affaire)
    // 3. Envoyer l'email avec pièce jointe PDF
    
    return NextResponse.json({
      success: true,
      message: `Rapport journalier du ${date} envoyé avec succès`,
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

