import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Calculer la date de fin basée sur les jours ouvrés
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
    const { date_debut, duree_jours_ouvres, type_horaire, calendrier_id, site_id } = body;

    if (!date_debut || duree_jours_ouvres === undefined || duree_jours_ouvres === null) {
      return NextResponse.json(
        { error: "date_debut et duree_jours_ouvres sont requis" },
        { status: 400 }
      );
    }

    const typeHoraire = type_horaire || "jour";
    const dureeJours = parseInt(duree_jours_ouvres.toString());

    // Appeler la fonction SQL pour calculer la date de fin (si disponible)
    // Sinon, calculer selon le type horaire
    const dateDebut = new Date(date_debut);
    let dateFin = new Date(dateDebut);
    
    // Calcul selon le type horaire
    switch (typeHoraire) {
      case "jour":
        // HN 5/7 : Exclut weekends et jours fériés
        // Si calendrier fourni, utiliser la fonction SQL avec calendrier
        if (calendrier_id) {
          // Récupérer le site_id du calendrier si disponible
          const { data: calendrierData } = await supabase
            .from("tbl_calendriers")
            .select("site_id")
            .eq("id", calendrier_id)
            .single();
          
          const siteIdCalendrier = calendrierData?.site_id || site_id || null;
          
          const { data, error } = await supabase.rpc("calculer_date_fin_jours_ouvres", {
            date_debut_activite: dateDebut.toISOString().split('T')[0],
            duree_jours_ouvres: dureeJours,
            site_id_activite: siteIdCalendrier,
          });
          
          if (!error && data) {
            return NextResponse.json({ date_fin: data }, { status: 200 });
          }
        } else {
          // Appeler la fonction SQL si disponible (sans calendrier spécifique)
          const { data, error } = await supabase.rpc("calculer_date_fin_jours_ouvres", {
            date_debut_activite: dateDebut.toISOString().split('T')[0],
            duree_jours_ouvres: dureeJours,
            site_id_activite: site_id || null,
          });
          
          if (!error && data) {
            return NextResponse.json({ date_fin: data }, { status: 200 });
          }
        }
        
        // Fallback : calcul simple sans jours fériés
        let joursAjoutes = 0;
        let joursOuvresComptes = 0;
        
        while (joursOuvresComptes < dureeJours) {
          joursAjoutes++;
          const dateTest = new Date(dateDebut);
          dateTest.setDate(dateTest.getDate() + joursAjoutes);
          
          // Exclure samedi (6) et dimanche (0)
          if (dateTest.getDay() !== 0 && dateTest.getDay() !== 6) {
            joursOuvresComptes++;
          }
        }
        
        dateFin = new Date(dateDebut);
        dateFin.setDate(dateFin.getDate() + joursAjoutes);
        break;
        
      case "3x8":
      case "accelerer":
        // Travail 24/7 ou accéléré : inclut tous les jours
        dateFin.setDate(dateFin.getDate() + dureeJours);
        break;
        
      case "nuit":
      case "weekend":
      case "ferie":
        // Pour ces types, on peut inclure tous les jours ou appliquer une logique spécifique
        // Par défaut, on inclut tous les jours
        dateFin.setDate(dateFin.getDate() + dureeJours);
        break;
        
      default:
        // Par défaut, calcul simple en jours calendaires
        dateFin.setDate(dateFin.getDate() + dureeJours);
    }
    
    return NextResponse.json({ date_fin: dateFin.toISOString() }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

