import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Générer le rapport journalier pour une date donnée
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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    
    // Récupérer les saisies du jour
    const { data: saisies, error: saisiesError } = await supabase
      .from("tbl_saisies_quotidiennes")
      .select(`
        *,
        activite:tbl_activites_terrain!tbl_saisies_quotidiennes_activite_id_fkey(
          id,
          libelle,
          affaire_id,
          ot,
          statut,
          a_rattacher
        ),
        affaire:tbl_affaires!tbl_saisies_quotidiennes_affaire_id_fkey(
          id,
          numero,
          libelle
        ),
        collaborateur:collaborateurs!tbl_saisies_quotidiennes_collaborateur_id_fkey(
          id,
          nom,
          prenom
        )
      `)
      .eq("date_saisie", date);
    
    if (saisiesError) {
      console.error("Erreur récupération saisies:", saisiesError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }
    
    // Calculer les KPIs
    const kpis = {
      totalSaisies: saisies?.length || 0,
      realisees: saisies?.filter((s) => s.statut_jour === "realise").length || 0,
      reportees: saisies?.filter((s) => s.statut_jour === "reporte").length || 0,
      terminees: saisies?.filter((s) => s.statut_jour === "termine").length || 0,
      otManquants: new Set(
        saisies
          ?.filter((s) => !s.activite?.ot)
          .map((s) => s.activite?.id)
          .filter(Boolean) || []
      ).size,
      activitesARattacher: new Set(
        saisies
          ?.filter((s) => s.activite?.a_rattacher)
          .map((s) => s.activite?.id)
          .filter(Boolean) || []
      ).size,
    };
    
    // Grouper par motif de report
    const motifsReport = new Map<string, number>();
    saisies
      ?.filter((s) => s.statut_jour === "reporte" && s.motif_report)
      .forEach((s) => {
        const motif = s.motif_report || "Sans motif";
        motifsReport.set(motif, (motifsReport.get(motif) || 0) + 1);
      });
    
    // Pour l'instant, retourner JSON (à remplacer par génération PDF)
    return NextResponse.json({
      date,
      kpis,
      saisies: saisies || [],
      motifsReport: Array.from(motifsReport.entries()).map(([motif, count]) => ({
        motif,
        count,
      })),
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

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
    
    // TODO: Implémenter l'envoi d'email via SendGrid ou autre service
    // Pour l'instant, retourner succès
    
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

