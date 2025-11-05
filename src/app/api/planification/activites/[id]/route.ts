import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer une activité spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("tbl_planification_activites")
      .select(`
        *,
        affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle, statut),
        lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
        site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
        responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Activité non trouvée" },
          { status: 404 }
        );
      }
      console.error("Erreur lors de la récupération de l'activité:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'activité" },
        { status: 500 }
      );
    }

    // Transformation des données
    const activite = {
      ...data,
      affaire: Array.isArray(data.affaire) ? data.affaire[0] || null : data.affaire || null,
      lot: Array.isArray(data.lot) ? data.lot[0] || null : data.lot || null,
      site: Array.isArray(data.site) ? data.site[0] || null : data.site || null,
      responsable: Array.isArray(data.responsable) ? data.responsable[0] || null : data.responsable || null,
    };

    return NextResponse.json({ activite }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// PATCH : Mettre à jour une activité
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const {
      libelle,
      description,
      date_debut_prevue,
      date_fin_prevue,
      date_debut_reelle,
      date_fin_reelle,
      responsable_id,
      heures_prevues,
      heures_reelles,
      type_horaire,
      coefficient,
      statut,
      pourcentage_avancement,
      activite_precedente_id,
      type_dependance,
      commentaire,
      lot_id,
      site_id,
      calendrier_id,
      // Nouveaux champs
      parent_id,
      duree_jours_ouvres,
      calcul_auto_date_fin,
    } = body;

    // Construire l'objet de mise à jour (seulement les champs fournis)
    const updates: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Gérer les valeurs null explicitement
    if (libelle !== undefined) updates.libelle = libelle;
    if (description !== undefined) updates.description = description || null;
    if (date_debut_prevue !== undefined) updates.date_debut_prevue = date_debut_prevue || null;
    if (date_fin_prevue !== undefined) updates.date_fin_prevue = date_fin_prevue || null;
    // Gestion des dates réelles : la contrainte permet date_debut_reelle seul, ou les deux ensemble
    // date_fin_reelle seule n'est pas autorisée
    if (date_debut_reelle !== undefined) {
      if (date_debut_reelle === null) {
        // Mettre à NULL : si date_fin_reelle est aussi fournie et NULL, on met les deux à NULL
        if (date_fin_reelle === undefined || date_fin_reelle === null) {
          updates.date_debut_reelle = null;
          // Si date_fin_reelle est fournie explicitement comme NULL, on la met aussi à NULL
          if (date_fin_reelle === null) {
            updates.date_fin_reelle = null;
          }
        }
      } else {
        // Définir date_debut_reelle - possible même si date_fin_reelle est NULL
        updates.date_debut_reelle = date_debut_reelle;
      }
    }
    
    if (date_fin_reelle !== undefined) {
      if (date_fin_reelle === null) {
        // Mettre date_fin_reelle à NULL - nécessite aussi date_debut_reelle à NULL
        if (date_debut_reelle === null || (date_debut_reelle === undefined && updates.date_debut_reelle === null)) {
          updates.date_fin_reelle = null;
        } else {
          console.warn("Impossible de mettre date_fin_reelle à NULL sans mettre date_debut_reelle à NULL");
        }
      } else {
        // Définir date_fin_reelle - nécessite que date_debut_reelle soit aussi définie
        if (date_debut_reelle !== undefined && date_debut_reelle !== null) {
          updates.date_fin_reelle = date_fin_reelle;
        } else if (updates.date_debut_reelle) {
          // date_debut_reelle est déjà dans les updates, on peut définir date_fin_reelle
          updates.date_fin_reelle = date_fin_reelle;
        } else {
          // Récupérer l'activité actuelle pour vérifier si date_debut_reelle existe
          const { data: currentActivity } = await supabase
            .from("tbl_planification_activites")
            .select("date_debut_reelle")
            .eq("id", id)
            .single();
          
          if (currentActivity?.date_debut_reelle) {
            updates.date_fin_reelle = date_fin_reelle;
          } else {
            console.warn("Impossible de définir date_fin_reelle sans date_debut_reelle");
          }
        }
      }
    }
    if (responsable_id !== undefined) updates.responsable_id = responsable_id || null;
    if (heures_prevues !== undefined) updates.heures_prevues = heures_prevues ?? 0;
    if (heures_reelles !== undefined) updates.heures_reelles = heures_reelles ?? 0;
    if (type_horaire !== undefined) updates.type_horaire = type_horaire;
    if (coefficient !== undefined) updates.coefficient = coefficient ?? 1.0;
    // Valider le statut et gérer les verrouillages automatiques
    const statutsValides = ['planifiee', 'lancee', 'suspendue', 'reportee', 'terminee', 'annulee', 'prolongee', 'archivee'];
    if (statut !== undefined) {
      if (statutsValides.includes(statut)) {
        updates.statut = statut;
        
        // Quand le statut passe à "lancee", verrouiller automatiquement la date de début
        if (statut === 'lancee') {
          // Récupérer l'activité actuelle pour vérifier si elle est déjà lancée
          const { data: currentActivity } = await supabase
            .from("tbl_planification_activites")
            .select("statut, date_debut_prevue, date_debut_reelle")
            .eq("id", id)
            .single();
          
          // Si l'activité n'était pas déjà lancée, verrouiller la date de début
          if (currentActivity && currentActivity.statut !== 'lancee') {
            // Utiliser la date de début réelle si fournie, sinon la date prévue actuelle, sinon aujourd'hui
            const dateVerrouillage = date_debut_reelle 
              ? new Date(date_debut_reelle)
              : (currentActivity.date_debut_prevue 
                ? new Date(currentActivity.date_debut_prevue)
                : new Date());
            
            // Mettre à jour date_debut_prevue avec la date de verrouillage (date réelle de lancement)
            dateVerrouillage.setHours(0, 0, 0, 0);
            updates.date_debut_prevue = dateVerrouillage.toISOString();
            
            // Si date_debut_reelle n'est pas fournie, la définir aussi
            if (!date_debut_reelle) {
              updates.date_debut_reelle = dateVerrouillage.toISOString();
            }
          }
        }
        
        // Quand le statut passe à "terminee", verrouiller les dates de fin
        if (statut === 'terminee') {
          const { data: currentActivity } = await supabase
            .from("tbl_planification_activites")
            .select("date_fin_prevue, date_fin_reelle")
            .eq("id", id)
            .single();
          
          if (currentActivity) {
            // Utiliser la date de fin réelle si fournie, sinon la date prévue actuelle
            const dateFinVerrouillage = date_fin_reelle 
              ? new Date(date_fin_reelle)
              : (currentActivity.date_fin_prevue 
                ? new Date(currentActivity.date_fin_prevue)
                : new Date());
            
            dateFinVerrouillage.setHours(0, 0, 0, 0);
            updates.date_fin_prevue = dateFinVerrouillage.toISOString();
            
            if (!date_fin_reelle) {
              updates.date_fin_reelle = dateFinVerrouillage.toISOString();
            }
          }
        }
        
        // Quand le statut passe à "reportee", recalculer automatiquement les dates
        if (statut === 'reportee') {
          const { data: currentActivity } = await supabase
            .from("tbl_planification_activites")
            .select("date_debut_prevue, date_fin_prevue, statut")
            .eq("id", id)
            .single();
          
          // Si l'activité n'était pas déjà reportée et qu'une nouvelle date de début est fournie
          if (currentActivity && currentActivity.statut !== 'reportee' && date_debut_prevue) {
            const ancienneDateDebut = new Date(currentActivity.date_debut_prevue);
            const ancienneDateFin = new Date(currentActivity.date_fin_prevue);
            const dureeInitiale = ancienneDateFin.getTime() - ancienneDateDebut.getTime();
            
            // Nouvelle date de début (date de reprise)
            const nouvelleDateDebut = new Date(date_debut_prevue);
            nouvelleDateDebut.setHours(0, 0, 0, 0);
            
            // Recalculer la date de fin pour préserver la durée initiale
            const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeInitiale);
            nouvelleDateFin.setHours(0, 0, 0, 0);
            
            updates.date_debut_prevue = nouvelleDateDebut.toISOString();
            updates.date_fin_prevue = nouvelleDateFin.toISOString();
          } else if (currentActivity && currentActivity.statut === 'reportee' && date_debut_prevue) {
            // Si déjà reportée, recalculer aussi si date de début change
            const ancienneDateDebut = new Date(currentActivity.date_debut_prevue);
            const ancienneDateFin = new Date(currentActivity.date_fin_prevue);
            const dureeInitiale = ancienneDateFin.getTime() - ancienneDateDebut.getTime();
            
            const nouvelleDateDebut = new Date(date_debut_prevue);
            nouvelleDateDebut.setHours(0, 0, 0, 0);
            
            const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeInitiale);
            nouvelleDateFin.setHours(0, 0, 0, 0);
            
            updates.date_debut_prevue = nouvelleDateDebut.toISOString();
            updates.date_fin_prevue = nouvelleDateFin.toISOString();
          }
        }
      } else {
        console.warn(`Statut invalide reçu: ${statut}. Valeurs attendues: ${statutsValides.join(', ')}`);
        // Ne pas mettre à jour le statut si invalide, mais continuer avec les autres updates
      }
    }
    
    // Si le statut est "lancee" et qu'on essaie de modifier date_debut_prevue, vérifier le verrouillage
    if (date_debut_prevue !== undefined && statut === undefined) {
      // Récupérer l'activité actuelle pour vérifier le statut
      const { data: currentActivity } = await supabase
        .from("tbl_planification_activites")
        .select("statut, date_debut_prevue")
        .eq("id", id)
        .single();
      
      // Si l'activité est lancée, prolongée, suspendue ou terminée, empêcher la modification de date_debut_prevue
      if (currentActivity && ['lancee', 'prolongee', 'suspendue', 'terminee'].includes(currentActivity.statut)) {
        // Ne pas mettre à jour date_debut_prevue, garder la valeur actuelle
        delete updates.date_debut_prevue;
        console.warn(`Tentative de modification de date_debut_prevue pour une activité avec statut "${currentActivity.statut}" - modification ignorée`);
      }
    }
    if (pourcentage_avancement !== undefined) updates.pourcentage_avancement = pourcentage_avancement ?? 0;
    if (activite_precedente_id !== undefined) updates.activite_precedente_id = activite_precedente_id || null;
    if (type_dependance !== undefined) updates.type_dependance = type_dependance || null;
    if (commentaire !== undefined) updates.commentaire = commentaire || null;
    if (lot_id !== undefined) updates.lot_id = lot_id || null;
    if (site_id !== undefined) updates.site_id = site_id || null;
    if (calendrier_id !== undefined) updates.calendrier_id = calendrier_id || null;
    // Nouveaux champs
    if (parent_id !== undefined) updates.parent_id = parent_id || null;
    if (duree_jours_ouvres !== undefined) updates.duree_jours_ouvres = duree_jours_ouvres || null;
    if (calcul_auto_date_fin !== undefined) updates.calcul_auto_date_fin = calcul_auto_date_fin ?? false;

    // Validation des dates si fournies
    if (date_debut_prevue && date_fin_prevue && new Date(date_fin_prevue) < new Date(date_debut_prevue)) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début" },
        { status: 400 }
      );
    }

    // Logger pour debug
    console.log("[PATCH /api/planification/activites/[id]] Updates:", JSON.stringify(updates, null, 2));
    console.log("[PATCH /api/planification/activites/[id]] Activity ID:", id);

    const { data, error } = await supabase
      .from("tbl_planification_activites")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        affaire:tbl_affaires!tbl_planification_activites_affaire_id_fkey(id, numero, libelle),
        lot:tbl_affaires_lots(id, numero_lot, libelle_lot),
        site:tbl_sites!tbl_planification_activites_site_id_fkey(site_id, site_code, site_label),
        responsable:collaborateurs!tbl_planification_activites_responsable_id_fkey(id, nom, prenom)
      `)
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour de l'activité:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        updates,
        id,
      });
      return NextResponse.json(
        { 
          error: "Erreur lors de la mise à jour de l'activité", 
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    // Transformation des données
    const activite = {
      ...data,
      affaire: Array.isArray(data.affaire) ? data.affaire[0] || null : data.affaire || null,
      lot: Array.isArray(data.lot) ? data.lot[0] || null : data.lot || null,
      site: Array.isArray(data.site) ? data.site[0] || null : data.site || null,
      responsable: Array.isArray(data.responsable) ? data.responsable[0] || null : data.responsable || null,
    };

    return NextResponse.json({ activite }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// DELETE : Supprimer une activité
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { error } = await supabase
      .from("tbl_planification_activites")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur lors de la suppression de l'activité:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de l'activité", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

