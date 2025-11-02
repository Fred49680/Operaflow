import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST : Appliquer un template à une affaire
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
    const { template_id, affaire_id, date_debut_base } = body;

    if (!template_id || !affaire_id || !date_debut_base) {
      return NextResponse.json(
        { error: "template_id, affaire_id et date_debut_base sont requis" },
        { status: 400 }
      );
    }

    // Récupérer le template avec ses tâches
    const { data: templateData, error: templateError } = await supabase
      .from("tbl_planification_templates")
      .select(`
        *,
        taches:tbl_planification_template_taches(*)
      `)
      .eq("id", template_id)
      .single();

    if (templateError || !templateData) {
      return NextResponse.json(
        { error: "Template non trouvé" },
        { status: 404 }
      );
    }

    const taches = Array.isArray(templateData.taches) ? templateData.taches : [];
    const dateDebutBase = new Date(date_debut_base);

    // Créer les activités depuis le template
    const activitesCreees: string[] = [];
    
    // Fonction récursive pour créer les activités avec leur hiérarchie
    const creerActivite = async (
      tacheTemplate: { id: string; libelle: string; description?: string; duree_jours_ouvres?: number; heures_prevues?: number; type_horaire?: string; parent_template_tache_id?: string },
      parentActiviteId: string | null = null,
      dateDebutActuelle: Date = dateDebutBase
    ): Promise<string | null> => {
      const dateDebut = new Date(dateDebutActuelle);
      const dateFin = new Date(dateDebut);

      // Calculer la date de fin si durée en jours ouvrés
      if (tacheTemplate.duree_jours_ouvres) {
        // Utiliser la fonction SQL pour calculer la date de fin
        const { data: dateFinData } = await supabase.rpc(
          "calculer_date_fin_jours_ouvres",
          {
            date_debut_activite: dateDebut.toISOString().split("T")[0],
            duree_jours_ouvres: tacheTemplate.duree_jours_ouvres,
            site_id_activite: null,
          }
        );
        if (dateFinData) {
          dateFin = new Date(dateFinData);
        }
      } else {
        // Si pas de durée, utiliser 1 jour par défaut
        dateFin = new Date(dateDebut);
        dateFin.setDate(dateFin.getDate() + 1);
      }

      // Créer l'activité
      const { data: activite, error: activiteError } = await supabase
        .from("tbl_planification_activites")
        .insert({
          affaire_id,
          parent_id: parentActiviteId,
          libelle: tacheTemplate.libelle,
          description: tacheTemplate.description || null,
          date_debut_prevue: dateDebut.toISOString(),
          date_fin_prevue: dateFin.toISOString(),
          heures_prevues: tacheTemplate.heures_prevues || 0,
          type_horaire: tacheTemplate.type_horaire || "jour",
          duree_jours_ouvres: tacheTemplate.duree_jours_ouvres || null,
          calcul_auto_date_fin: tacheTemplate.duree_jours_ouvres ? true : false,
          created_by: user.id,
        })
        .select()
        .single();

      if (activiteError || !activite) {
        console.error("Erreur création activité:", activiteError);
        return null;
      }

      activitesCreees.push(activite.id);

      // Créer les sous-tâches récursivement
      const sousTaches = taches.filter(
        (t: { parent_template_tache_id?: string }) => t.parent_template_tache_id === tacheTemplate.id
      );
      
      for (const sousTache of sousTaches) {
        await creerActivite(sousTache, activite.id, dateFin);
      }

      return activite.id;
    };

    // Créer les tâches de niveau racine (sans parent)
    const tachesRacine = taches.filter((t: { parent_template_tache_id?: string }) => !t.parent_template_tache_id);
    for (const tacheRacine of tachesRacine) {
      await creerActivite(tacheRacine, null, dateDebutBase);
    }

    return NextResponse.json(
      { 
        success: true, 
        activites_creees: activitesCreees.length,
        activites_ids: activitesCreees 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

