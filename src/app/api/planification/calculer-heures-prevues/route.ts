import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Calculer les heures prévues basées sur le calendrier et la durée
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
    const { date_debut, date_fin, calendrier_id, site_id, duree_jours_ouvres } = body;

    if (!date_debut || !date_fin) {
      return NextResponse.json(
        { error: "date_debut et date_fin sont requis" },
        { status: 400 }
      );
    }

    const dateDebut = new Date(date_debut);
    const dateFin = new Date(date_fin);

    // Calculer les heures prévues selon le calendrier
    let heuresPrevues = 0;

    if (calendrier_id) {
      // Utiliser le calendrier spécifique
      const dateCourante = new Date(dateDebut);
      
      // Récupérer le site_id du calendrier si disponible
      const { data: calendrierData } = await supabase
        .from("tbl_calendriers")
        .select("site_id")
        .eq("id", calendrier_id)
        .single();
      
      const siteIdCalendrier = calendrierData?.site_id || site_id || null;

      while (dateCourante <= dateFin) {
        // Vérifier d'abord s'il y a une exception pour ce jour dans le calendrier
        const dateStr = dateCourante.toISOString().split('T')[0];
        
        const { data: exceptionJour } = await supabase
          .from("tbl_calendrier_jours")
          .select("heures_travail")
          .eq("calendrier_id", calendrier_id)
          .eq("date_jour", dateStr)
          .single();
        
        if (exceptionJour) {
          // Utiliser l'exception
          heuresPrevues += parseFloat(exceptionJour.heures_travail.toString());
        } else {
          // Utiliser la semaine type
          const jourSemaine = dateCourante.getDay(); // 0 = dimanche, 6 = samedi
          
          const { data: semaineType } = await supabase
            .from("tbl_calendrier_semaine_type")
            .select("heures_travail")
            .eq("calendrier_id", calendrier_id)
            .eq("jour_semaine", jourSemaine)
            .single();
          
          if (semaineType) {
            heuresPrevues += parseFloat(semaineType.heures_travail.toString());
          } else {
            // Fallback : utiliser la fonction générale
            const { data: heures, error } = await supabase.rpc("get_heures_travail_jour_v2", {
              p_date: dateStr,
              p_site_id: siteIdCalendrier,
            });

            if (!error && heures !== null && heures !== undefined) {
              heuresPrevues += parseFloat(heures.toString());
            }
          }
        }
        
        dateCourante.setDate(dateCourante.getDate() + 1);
      }
    } else if (duree_jours_ouvres) {
      // Si pas de calendrier, utiliser une valeur par défaut (8h par jour ouvré)
      heuresPrevues = duree_jours_ouvres * 8;
    } else {
      // Calculer entre date_debut et date_fin sans calendrier
      const dateCourante = new Date(dateDebut);
      let joursOuvresComptes = 0;

      while (dateCourante <= dateFin) {
        const jour = dateCourante.getDay();
        // Exclure samedi (6) et dimanche (0)
        if (jour !== 0 && jour !== 6) {
          joursOuvresComptes++;
        }
        dateCourante.setDate(dateCourante.getDate() + 1);
      }

      heuresPrevues = joursOuvresComptes * 8;
    }

    return NextResponse.json({ 
      heures_prevues: Math.round(heuresPrevues * 100) / 100 
    }, { status: 200 });
  } catch (error) {
    console.error("Erreur calcul heures prévues:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

