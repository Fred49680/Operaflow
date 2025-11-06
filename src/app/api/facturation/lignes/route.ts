import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les lignes de facturation pour un mois donné
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
    const affaireId = searchParams.get("affaire_id");
    
    if (!annee || !mois) {
      return NextResponse.json(
        { error: "Année et mois sont requis" },
        { status: 400 }
      );
    }
    
    // Construire la date de début et fin du mois
    const dateDebut = `${annee}-${mois.padStart(2, "0")}-01`;
    const dateFin = new Date(Number(annee), Number(mois), 0).toISOString().split("T")[0];
    
    // Récupérer les saisies quotidiennes du mois (uniquement "realise" et "termine")
    let querySaisies = supabase
      .from("tbl_saisies_quotidiennes")
      .select(`
        *,
        activite:tbl_activites_terrain!tbl_saisies_quotidiennes_activite_id_fkey(
          id,
          libelle,
          affaire_id,
          ot,
          tranche,
          systeme_elementaire,
          type_activite,
          type_horaire,
          poste_bpu_id
        ),
        affaire:tbl_affaires!tbl_saisies_quotidiennes_affaire_id_fkey(
          id,
          numero,
          libelle,
          type_valorisation
        )
      `)
      .eq("statut_jour", "realise")
      .gte("date_saisie", dateDebut)
      .lte("date_saisie", dateFin);
    
    if (affaireId) {
      querySaisies = querySaisies.eq("affaire_id", affaireId);
    }
    
    const { data: saisies, error: saisiesError } = await querySaisies;
    
    if (saisiesError) {
      console.error("Erreur récupération saisies:", saisiesError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }
    
    // Grouper les saisies selon les critères de facturation
    const lignesMap = new Map<string, {
      affaire_id: string;
      affaire_numero: string;
      ot: string | null;
      tranche: number | null;
      systeme_elementaire: string | null;
      type_activite: string | null;
      type_horaire: string | null;
      poste_bpu_id: string | null;
      heures: number;
      saisie_ids: string[];
    }>();
    
    (saisies || []).forEach((saisie: any) => {
      if (!saisie.activite || !saisie.affaire) return;
      
      // Clé de regroupement selon le type de valorisation
      const affaire = saisie.affaire;
      const activite = saisie.activite;
      
      let cle: string;
      if (affaire.type_valorisation === "BPU") {
        // Pour BPU : Tranche, Système élémentaire, Type d'activité, Type horaire, OT, Poste BPU
        cle = `${activite.affaire_id}_${activite.ot || ""}_${activite.tranche ?? ""}_${activite.systeme_elementaire || ""}_${activite.type_activite || ""}_${activite.type_horaire || ""}_${activite.poste_bpu_id || ""}`;
      } else {
        // Pour Dépense Contrôlée : regroupement simplifié
        cle = `${activite.affaire_id}_${activite.ot || ""}_${activite.type_activite || ""}`;
      }
      
      if (!lignesMap.has(cle)) {
        lignesMap.set(cle, {
          affaire_id: activite.affaire_id,
          affaire_numero: affaire.numero,
          ot: activite.ot,
          tranche: activite.tranche,
          systeme_elementaire: activite.systeme_elementaire,
          type_activite: activite.type_activite,
          type_horaire: activite.type_horaire,
          poste_bpu_id: activite.poste_bpu_id,
          heures: 0,
          saisie_ids: [],
        });
      }
      
      const ligne = lignesMap.get(cle)!;
      // Compter 8 heures par jour (à ajuster selon le calendrier réel)
      ligne.heures += 8;
      ligne.saisie_ids.push(saisie.id);
    });
    
    // Convertir en lignes de facturation avec calcul des montants
    const lignes: any[] = [];
    for (const [cle, data] of lignesMap.entries()) {
      // Récupérer le taux horaire et coefficient depuis l'affaire/BPU
      // Pour l'instant, valeurs par défaut (à compléter avec vraie logique BPU)
      const tauxHoraire = 50; // À récupérer depuis le BPU
      const coefficient = data.type_horaire === "nuit" ? 1.25 : 
                         data.type_horaire === "weekend" ? 1.5 :
                         data.type_horaire === "ferie" ? 2.0 : 1.0;
      
      const montantCalcule = data.heures * tauxHoraire * coefficient;
      
      lignes.push({
        id: cle,
        ...data,
        taux_horaire: tauxHoraire,
        coefficient: coefficient,
        montant_calcule: montantCalcule,
        montant_final: null,
        motif_derogation: null,
        statut: "a_facturer",
        date_saisie: dateDebut,
      });
    }
    
    return NextResponse.json({ lignes });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

