import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les collaborateurs filtrés selon les compétences requises
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activiteId = searchParams.get("activite_id");
    const siteId = searchParams.get("site_id");

    // Récupérer les compétences requises pour l'activité
    let competencesRequises: string[] = [];
    const niveauxRequis: Record<string, string> = {};

    if (activiteId) {
      const { data: competencesData } = await supabase
        .from("activites_competences_requises")
        .select("competence_id, niveau_requis, est_obligatoire")
        .eq("activite_id", activiteId)
        .eq("est_obligatoire", true);

      if (competencesData) {
        competencesRequises = competencesData.map((c) => c.competence_id);
        competencesData.forEach((c) => {
          niveauxRequis[c.competence_id] = c.niveau_requis;
        });
      }
    }

    // Récupérer tous les collaborateurs actifs
    let query = supabase
      .from("collaborateurs")
      .select("id, nom, prenom, email, site_id, statut")
      .eq("statut", "actif");

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data: collaborateurs, error: collabError } = await query;

    if (collabError) {
      console.error("Erreur récupération collaborateurs:", collabError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    if (!collaborateurs || collaborateurs.length === 0) {
      return NextResponse.json({ collaborateurs: [] });
    }

    // Si des compétences sont requises, filtrer les collaborateurs
    if (competencesRequises.length > 0) {
      const { data: competencesCollab, error: compError } = await supabase
        .from("collaborateurs_competences")
        .select("collaborateur_id, competence_id, niveau, statut")
        .in("collaborateur_id", collaborateurs.map((c) => c.id))
        .in("competence_id", competencesRequises)
        .eq("statut", "valide");

      if (compError) {
        console.error("Erreur récupération compétences:", compError);
        return NextResponse.json(
          { error: "Erreur lors de la récupération des compétences" },
          { status: 500 }
        );
      }

      // Grouper les compétences par collaborateur
      const competencesParCollab = new Map<string, Map<string, string>>();
      
      competencesCollab?.forEach((cc) => {
        if (!competencesParCollab.has(cc.collaborateur_id)) {
          competencesParCollab.set(cc.collaborateur_id, new Map());
        }
        competencesParCollab.get(cc.collaborateur_id)!.set(cc.competence_id, cc.niveau || "base");
      });

      // Filtrer les collaborateurs qui ont toutes les compétences requises avec le bon niveau
      const collaborateursFiltres = collaborateurs.filter((collab) => {
        const competencesCollab = competencesParCollab.get(collab.id);
        if (!competencesCollab) return false;

        // Vérifier que le collaborateur a toutes les compétences obligatoires
        return competencesRequises.every((compId) => {
          const niveauCollab = competencesCollab.get(compId);
          if (!niveauCollab) return false;

          const niveauRequis = niveauxRequis[compId] || "base";
          
          // Comparer les niveaux (base < intermediaire < expert)
          const niveauOrder: Record<string, number> = {
            base: 1,
            intermediaire: 2,
            expert: 3,
          };

          return (niveauOrder[niveauCollab] || 0) >= (niveauOrder[niveauRequis] || 1);
        });
      });

      // Enrichir avec les informations de compétences
      const collaborateursEnrichis = collaborateursFiltres.map((collab) => {
        const competencesCollab = competencesParCollab.get(collab.id) || new Map();
        return {
          ...collab,
          competences: Array.from(competencesCollab.entries()).map(([compId, niveau]) => ({
            competence_id: compId,
            niveau,
          })),
        };
      });

      return NextResponse.json({ collaborateurs: collaborateursEnrichis });
    }

    // Si pas de compétences requises, retourner tous les collaborateurs
    return NextResponse.json({ collaborateurs });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

