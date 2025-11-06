import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Générer le rapport mensuel pour un mois donné
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
    const annee = searchParams.get("annee");
    const mois = searchParams.get("mois");
    
    if (!annee || !mois) {
      return NextResponse.json(
        { error: "Année et mois sont requis" },
        { status: 400 }
      );
    }
    
    // Construire la date de début et fin du mois
    const dateDebut = `${annee}-${mois.padStart(2, "0")}-01`;
    const dateFin = new Date(Number(annee), Number(mois), 0).toISOString().split("T")[0];
    
    // Récupérer toutes les saisies du mois
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
        )
      `)
      .gte("date_saisie", dateDebut)
      .lte("date_saisie", dateFin);
    
    if (saisiesError) {
      console.error("Erreur récupération saisies:", saisiesError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }
    
    // Calculer les KPIs mensuels
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
      candidatsFacturation: 0, // À calculer depuis les lignes de facturation
    };
    
    // Grouper par affaire
    const parAffaire = new Map<string, any>();
    saisies?.forEach((saisie: any) => {
      if (!saisie.affaire) return;
      const affaireId = saisie.affaire.id;
      if (!parAffaire.has(affaireId)) {
        parAffaire.set(affaireId, {
          affaire: saisie.affaire,
          saisies: [],
        });
      }
      parAffaire.get(affaireId)!.saisies.push(saisie);
    });
    
    // Pour l'instant, retourner JSON (à remplacer par génération PDF)
    return NextResponse.json({
      periode: { annee, mois, dateDebut, dateFin },
      kpis,
      saisies: saisies || [],
      parAffaire: Array.from(parAffaire.values()),
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

