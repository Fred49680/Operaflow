import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Appliquer un template à une affaire
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, affaire_id, date_debut_reference } = body;

    if (!template_id || !affaire_id) {
      return NextResponse.json(
        { error: "template_id et affaire_id sont requis" },
        { status: 400 }
      );
    }

    // Récupérer le template et ses tâches
    const { data: template, error: templateError } = await supabase
      .from("tbl_planification_templates")
      .select(`
        *,
        taches:tbl_planification_template_taches(*)
      `)
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template non trouvé" },
        { status: 404 }
      );
    }

    // Récupérer l'affaire pour obtenir la date de début si non fournie
    const { data: affaire } = await supabase
      .from("tbl_affaires")
      .select("date_debut")
      .eq("id", affaire_id)
      .single();

    const dateReference = date_debut_reference || affaire?.date_debut || new Date().toISOString();
    const dateRef = new Date(dateReference);

    // Transformer les tâches du template en activités
    const taches = template.taches || [];
    
    // Créer les activités (dans l'ordre hiérarchique)
    const tachesAvecDates = taches.map((tache: { id: string; libelle: string; description?: string; duree_jours_ouvres?: number; heures_prevues?: number; type_horaire?: string; tache_precedente_id?: string; type_dependance?: string; parent_template_tache_id?: string; niveau_hierarchie?: number; ordre_affichage?: number }) => {
      const dateDebut = new Date(dateRef);
      
      // Si la tâche a une dépendance, calculer la date de début
      if (tache.tache_precedente_id && tache.type_dependance) {
        // Trouver la tâche précédente dans le template
        const tachePrecedente = taches.find((t: { id: string }) => t.id === tache.tache_precedente_id);
        if (tachePrecedente) {
          // Calcul basique selon le type de dépendance
          // Note: pour un calcul précis, on devrait recalculer après insertion
          // Les dates seront ajustées automatiquement par les triggers SQL
        }
      }
      
      // Calculer date de fin si durée en jours ouvrés
      const dateFin = new Date(dateDebut);
      if (tache.duree_jours_ouvres) {
        // Appeler la fonction SQL pour calculer
        // Pour l'instant, on ajoute simplement les jours (sera recalculé par le trigger)
        dateFin.setDate(dateFin.getDate() + Math.ceil(tache.duree_jours_ouvres * 1.4)); // Approximation (1.4 pour weekends)
      } else {
        dateFin.setDate(dateFin.getDate() + 1); // 1 jour par défaut
      }

      return {
        affaire_id,
        parent_id: null, // Sera géré après insertion
        libelle: tache.libelle,
        description: tache.description || null,
        date_debut_prevue: dateDebut.toISOString(),
        date_fin_prevue: dateFin.toISOString(),
        heures_prevues: tache.heures_prevues || 0,
        type_horaire: tache.type_horaire || "jour",
        duree_jours_ouvres: tache.duree_jours_ouvres || null,
        calcul_auto_date_fin: tache.duree_jours_ouvres ? true : false,
        activite_precedente_id: null, // Sera géré après insertion
        type_dependance: tache.type_dependance || null,
        // Données temporaires pour la hiérarchie
        _template_tache_id: tache.id,
        _parent_template_tache_id: tache.parent_template_tache_id,
        _ordre: tache.ordre_affichage || 0,
      };
    });

    // Trier par niveau hiérarchique et ordre
    tachesAvecDates.sort((a, b) => {
      const niveauA = taches.find((t) => t.id === a._template_tache_id)?.niveau_hierarchie || 0;
      const niveauB = taches.find((t) => t.id === b._template_tache_id)?.niveau_hierarchie || 0;
      if (niveauA !== niveauB) return niveauA - niveauB;
      return (a._ordre || 0) - (b._ordre || 0);
    });

    // Insérer les activités de niveau 0 d'abord, puis leurs enfants
    const activitesCrees: Array<{ id: string }> = [];
    const mapTemplateToActivite = new Map<string, string>(); // template_tache_id -> activite_id

    // Premier passage : créer toutes les activités de niveau 0
    for (const tacheData of tachesAvecDates) {
      const tacheTemplate = taches.find((t) => t.id === tacheData._template_tache_id);
      if (tacheTemplate && tacheTemplate.niveau_hierarchie === 0) {
        const { data: activite, error } = await supabase
          .from("tbl_planification_activites")
          .insert({
            affaire_id: tacheData.affaire_id,
            libelle: tacheData.libelle,
            description: tacheData.description,
            date_debut_prevue: tacheData.date_debut_prevue,
            date_fin_prevue: tacheData.date_fin_prevue,
            heures_prevues: tacheData.heures_prevues,
            type_horaire: tacheData.type_horaire,
            duree_jours_ouvres: tacheData.duree_jours_ouvres,
            calcul_auto_date_fin: tacheData.calcul_auto_date_fin,
            created_by: user.id,
          })
          .select()
          .single();

        if (activite && !error) {
          activitesCrees.push(activite);
          mapTemplateToActivite.set(tacheData._template_tache_id, activite.id);
        }
      }
    }

    // Deuxième passage : créer les sous-tâches avec parent_id
    for (const tacheData of tachesAvecDates) {
      const tacheTemplate = taches.find((t) => t.id === tacheData._template_tache_id);
      if (tacheTemplate && tacheTemplate.niveau_hierarchie && tacheTemplate.niveau_hierarchie > 0) {
        const parentActiviteId = mapTemplateToActivite.get(tacheTemplate.parent_template_tache_id || '');
        const activitePrecedenteId = tacheTemplate.tache_precedente_id 
          ? mapTemplateToActivite.get(tacheTemplate.tache_precedente_id)
          : null;

        const { data: activite, error } = await supabase
          .from("tbl_planification_activites")
          .insert({
            affaire_id: tacheData.affaire_id,
            parent_id: parentActiviteId || null,
            libelle: tacheData.libelle,
            description: tacheData.description,
            date_debut_prevue: tacheData.date_debut_prevue,
            date_fin_prevue: tacheData.date_fin_prevue,
            heures_prevues: tacheData.heures_prevues,
            type_horaire: tacheData.type_horaire,
            duree_jours_ouvres: tacheData.duree_jours_ouvres,
            calcul_auto_date_fin: tacheData.calcul_auto_date_fin,
            activite_precedente_id: activitePrecedenteId || null,
            type_dependance: tacheData.type_dependance,
            created_by: user.id,
          })
          .select()
          .single();

        if (activite && !error) {
          activitesCrees.push(activite);
          mapTemplateToActivite.set(tacheData._template_tache_id, activite.id);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      activites: activitesCrees,
      count: activitesCrees.length 
    }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

