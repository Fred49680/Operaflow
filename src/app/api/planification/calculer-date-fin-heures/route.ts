import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Calculer la date de fin basée sur les heures travaillées selon le calendrier
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
    const { date_debut, duree_heures, calendrier_id } = body;

    if (!date_debut || !duree_heures || !calendrier_id) {
      return NextResponse.json(
        { error: "date_debut, duree_heures et calendrier_id sont requis" },
        { status: 400 }
      );
    }

    const dateDebut = new Date(date_debut);
    const heuresRestantes = parseFloat(duree_heures.toString());
    
    if (heuresRestantes <= 0) {
      return NextResponse.json(
        { error: "duree_heures doit être positive" },
        { status: 400 }
      );
    }

    // Récupérer le site_id du calendrier si disponible
    const { data: calendrierData } = await supabase
      .from("tbl_calendriers")
      .select("site_id")
      .eq("id", calendrier_id)
      .single();
    
    const siteIdCalendrier = calendrierData?.site_id || null;

    // Calculer la date de fin en parcourant les jours selon le calendrier
    let dateCourante = new Date(dateDebut);
    let heuresAccumulees = 0;
    const heureDebutJournee = new Date(dateCourante);
    
    // Extraire l'heure de début de la date de début
    const heureDebutHeure = dateCourante.getHours();
    const heureDebutMinutes = dateCourante.getMinutes();
    
    // Récupérer les heures du calendrier pour le jour de début
    // Vérifier d'abord s'il y a une exception pour ce jour
    const dateDebutStr = dateCourante.toISOString().split('T')[0];
    const { data: exceptionJour } = await supabase
      .from("tbl_calendrier_jours")
      .select("heure_debut, heure_pause_debut, heure_pause_fin, heure_fin, type_jour")
      .eq("calendrier_id", calendrier_id)
      .eq("date", dateDebutStr)
      .single();
    
    let semaineType;
    if (exceptionJour && exceptionJour.type_jour === "ouvre") {
      // Utiliser l'exception du jour
      semaineType = exceptionJour;
    } else {
      // Sinon, utiliser la semaine type
      const jourSemaine = dateCourante.getDay(); // 0 = dimanche, 6 = samedi
      const { data: stData } = await supabase
        .from("tbl_calendrier_semaine_type")
        .select("heure_debut, heure_pause_debut, heure_pause_fin, heure_fin, type_jour")
        .eq("calendrier_id", calendrier_id)
        .eq("jour_semaine", jourSemaine)
        .single();
      semaineType = stData;
    }
    
    if (!semaineType || semaineType.type_jour !== "ouvre") {
      return NextResponse.json(
        { error: "Le jour de début n'est pas un jour ouvré dans le calendrier" },
        { status: 400 }
      );
    }

    // Parser les heures du calendrier
    const parseHeure = (heureStr: string | null): { heures: number; minutes: number } | null => {
      if (!heureStr) return null;
      const [h, m] = heureStr.split(":").map(Number);
      return { heures: h, minutes: m };
    };

    const heureDebutCal = parseHeure(semaineType.heure_debut);
    const heurePauseDebut = parseHeure(semaineType.heure_pause_debut);
    const heurePauseFin = parseHeure(semaineType.heure_pause_fin);
    const heureFinCal = parseHeure(semaineType.heure_fin);

    if (!heureDebutCal || !heureFinCal) {
      return NextResponse.json(
        { error: "Heures du calendrier non définies pour ce jour" },
        { status: 400 }
      );
    }

    // Calculer les heures disponibles pour le jour de début (depuis l'heure de début de la tâche)
    let heuresDisponiblesJour = 0;
    
    // Si la tâche commence avant la pause, calculer les heures jusqu'à la pause
    const minutesDebutTache = heureDebutHeure * 60 + heureDebutMinutes;
    const minutesPauseDebut = heurePauseDebut ? (heurePauseDebut.heures * 60 + heurePauseDebut.minutes) : null;
    const minutesPauseFin = heurePauseFin ? (heurePauseFin.heures * 60 + heurePauseFin.minutes) : null;
    const minutesFinJournee = heureFinCal.heures * 60 + heureFinCal.minutes;

    if (minutesPauseDebut && minutesDebutTache < minutesPauseDebut) {
      // Heures disponibles jusqu'à la pause
      heuresDisponiblesJour = (minutesPauseDebut - minutesDebutTache) / 60;
      
      // Si on a besoin de plus d'heures et qu'il y a une reprise après pause
      if (heuresRestantes > heuresDisponiblesJour && minutesPauseFin) {
        heuresDisponiblesJour += (minutesFinJournee - minutesPauseFin) / 60;
      }
    } else if (minutesPauseFin && minutesDebutTache >= minutesPauseFin) {
      // La tâche commence après la pause
      heuresDisponiblesJour = (minutesFinJournee - minutesDebutTache) / 60;
    } else {
      // Pas de pause ou tâche qui commence après le début de la pause
      heuresDisponiblesJour = (minutesFinJournee - minutesDebutTache) / 60;
    }

    heuresAccumulees += heuresDisponiblesJour;

    // Si on a assez d'heures dans le premier jour
    if (heuresAccumulees >= heuresRestantes) {
      // Calculer l'heure de fin exacte
      const heuresRestantesJour = heuresRestantes;
      let dateFin = new Date(dateCourante);
      
      if (minutesPauseDebut && minutesDebutTache < minutesPauseDebut) {
        // Si on finit avant la pause
        if (heuresRestantesJour <= (minutesPauseDebut - minutesDebutTache) / 60) {
          const minutesFin = minutesDebutTache + heuresRestantesJour * 60;
          dateFin.setHours(Math.floor(minutesFin / 60), minutesFin % 60, 0, 0);
        } else {
          // On dépasse la pause, continuer après la pause
          const heuresAvantPause = (minutesPauseDebut - minutesDebutTache) / 60;
          const heuresApresPause = heuresRestantesJour - heuresAvantPause;
          const minutesFin = minutesPauseFin! + heuresApresPause * 60;
          dateFin.setHours(Math.floor(minutesFin / 60), minutesFin % 60, 0, 0);
        }
      } else if (minutesPauseFin && minutesDebutTache >= minutesPauseFin) {
        // Commence après la pause
        const minutesFin = minutesDebutTache + heuresRestantesJour * 60;
        dateFin.setHours(Math.floor(minutesFin / 60), minutesFin % 60, 0, 0);
      } else {
        // Pas de pause
        const minutesFin = minutesDebutTache + heuresRestantesJour * 60;
        dateFin.setHours(Math.floor(minutesFin / 60), minutesFin % 60, 0, 0);
      }
      
      return NextResponse.json({ date_fin: dateFin.toISOString() }, { status: 200 });
    }

    // Sinon, continuer les jours suivants
    let heuresRestantesTotal = heuresRestantes - heuresDisponiblesJour;
    dateCourante.setDate(dateCourante.getDate() + 1);

    // Parcourir les jours suivants jusqu'à atteindre le nombre d'heures requis
    while (heuresRestantesTotal > 0) {
      const jourSemaineActuel = dateCourante.getDay();
      
      // Vérifier d'abord s'il y a une exception pour ce jour
      const dateActuelleStr = dateCourante.toISOString().split('T')[0];
      const { data: exceptionJourActuel } = await supabase
        .from("tbl_calendrier_jours")
        .select("heure_debut, heure_pause_debut, heure_pause_fin, heure_fin, type_jour")
        .eq("calendrier_id", calendrier_id)
        .eq("date", dateActuelleStr)
        .single();
      
      let stJour;
      if (exceptionJourActuel && exceptionJourActuel.type_jour === "ouvre") {
        stJour = exceptionJourActuel;
      } else {
        // Sinon, utiliser la semaine type
        const { data: stData } = await supabase
          .from("tbl_calendrier_semaine_type")
          .select("heure_debut, heure_pause_debut, heure_pause_fin, heure_fin, type_jour")
          .eq("calendrier_id", calendrier_id)
          .eq("jour_semaine", jourSemaineActuel)
          .single();
        stJour = stData;
      }
      
      if (stJour && stJour.type_jour === "ouvre") {
        const heureDebutJour = parseHeure(stJour.heure_debut);
        const heurePauseDebutJour = parseHeure(stJour.heure_pause_debut);
        const heurePauseFinJour = parseHeure(stJour.heure_pause_fin);
        const heureFinJour = parseHeure(stJour.heure_fin);
        
        if (heureDebutJour && heureFinJour) {
          const minutesDebutJour = heureDebutJour.heures * 60 + heureDebutJour.minutes;
          const minutesPauseDebutJour = heurePauseDebutJour ? (heurePauseDebutJour.heures * 60 + heurePauseDebutJour.minutes) : null;
          const minutesPauseFinJour = heurePauseFinJour ? (heurePauseFinJour.heures * 60 + heurePauseFinJour.minutes) : null;
          const minutesFinJour = heureFinJour.heures * 60 + heureFinJour.minutes;
          
          // Calculer les heures disponibles pour ce jour
          let heuresJour = 0;
          if (minutesPauseDebutJour && minutesPauseFinJour) {
            // Heures matin + après-midi
            heuresJour = (minutesPauseDebutJour - minutesDebutJour) / 60 + (minutesFinJour - minutesPauseFinJour) / 60;
          } else {
            // Pas de pause, heures complètes
            heuresJour = (minutesFinJour - minutesDebutJour) / 60;
          }
          
          if (heuresRestantesTotal <= heuresJour) {
            // On finit dans ce jour
            let dateFin = new Date(dateCourante);
            
            if (heuresRestantesTotal <= (minutesPauseDebutJour ? (minutesPauseDebutJour - minutesDebutJour) / 60 : heuresJour)) {
              // Finit avant la pause
              const minutesFin = minutesDebutJour + heuresRestantesTotal * 60;
              dateFin.setHours(Math.floor(minutesFin / 60), minutesFin % 60, 0, 0);
            } else {
              // Dépasse la pause
              const heuresAvantPause = minutesPauseDebutJour ? (minutesPauseDebutJour - minutesDebutJour) / 60 : 0;
              const heuresApresPause = heuresRestantesTotal - heuresAvantPause;
              const minutesFin = minutesPauseFinJour! + heuresApresPause * 60;
              dateFin.setHours(Math.floor(minutesFin / 60), minutesFin % 60, 0, 0);
            }
            
            return NextResponse.json({ date_fin: dateFin.toISOString() }, { status: 200 });
          }
          
          heuresRestantesTotal -= heuresJour;
        }
      }
      
      dateCourante.setDate(dateCourante.getDate() + 1);
      
      // Sécurité : limite à 365 jours
      if (dateCourante.getTime() - dateDebut.getTime() > 365 * 24 * 60 * 60 * 1000) {
        break;
      }
    }

    // Si on arrive ici, on a parcouru tous les jours, utiliser la dernière date
    const dateFin = new Date(dateCourante);
    if (heureFinCal) {
      dateFin.setHours(heureFinCal.heures, heureFinCal.minutes, 0, 0);
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

