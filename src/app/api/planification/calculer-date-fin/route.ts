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
    const { date_debut, duree_jours_ouvres } = body;

    if (!date_debut || !duree_jours_ouvres) {
      return NextResponse.json(
        { error: "date_debut et duree_jours_ouvres sont requis" },
        { status: 400 }
      );
    }

    // Appeler la fonction SQL pour calculer la date de fin
    // Signature: calculer_date_fin_jours_ouvres(date_debut_activite, duree_jours_ouvres, site_id_activite)
    const { data, error } = await supabase.rpc("calculer_date_fin_jours_ouvres", {
      date_debut_activite: new Date(date_debut).toISOString().split('T')[0], // Format DATE (YYYY-MM-DD)
      duree_jours_ouvres: parseInt(duree_jours_ouvres.toString()),
      site_id_activite: null, // Optionnel, peut être null
    });

    if (error) {
      console.error("Erreur lors du calcul:", error);
      // Fallback : calcul simple sans jours fériés
      const dateDebut = new Date(date_debut);
      let joursAjoutes = 0;
      let joursOuvresComptes = 0;
      
      while (joursOuvresComptes < duree_jours_ouvres) {
        joursAjoutes++;
        const dateTest = new Date(dateDebut);
        dateTest.setDate(dateTest.getDate() + joursAjoutes);
        
        // Exclure samedi (6) et dimanche (0)
        if (dateTest.getDay() !== 0 && dateTest.getDay() !== 6) {
          joursOuvresComptes++;
        }
      }
      
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateFin.getDate() + joursAjoutes);
      
      return NextResponse.json({ date_fin: dateFin.toISOString() }, { status: 200 });
    }

    return NextResponse.json({ date_fin: data }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

