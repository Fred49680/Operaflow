import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les heures du calendrier pour un jour donné
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const calendrierId = searchParams.get("calendrier_id");
    const dateStr = searchParams.get("date"); // Format: YYYY-MM-DD ou ISO string

    if (!calendrierId || !dateStr) {
      return NextResponse.json(
        { error: "calendrier_id et date sont requis" },
        { status: 400 }
      );
    }

    // Extraire le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
    const date = new Date(dateStr);
    const jourSemaine = date.getDay(); // 0 (dimanche) à 6 (samedi)

    // Récupérer les heures du calendrier pour ce jour
    const { data, error } = await supabase
      .from("tbl_calendrier_semaine_type")
      .select("heure_debut, heure_fin, heures_travail, type_jour")
      .eq("calendrier_id", calendrierId)
      .eq("jour_semaine", jourSemaine)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Aucun enregistrement trouvé, retourner des valeurs par défaut
        return NextResponse.json({
          heure_debut: "08:00",
          heure_fin: "16:00",
          heures_travail: 7,
          type_jour: "ouvre",
        });
      }
      console.error("Erreur récupération heures calendrier:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des heures" },
        { status: 500 }
      );
    }

    // Si pas de données ou jour chômé, retourner null
    if (!data || data.type_jour === "chome") {
      return NextResponse.json({
        heure_debut: null,
        heure_fin: null,
        heures_travail: 0,
        type_jour: "chome",
      });
    }

    return NextResponse.json({
      heure_debut: data.heure_debut || "08:00",
      heure_fin: data.heure_fin || "16:00",
      heures_travail: data.heures_travail || 0,
      type_jour: data.type_jour || "ouvre",
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

