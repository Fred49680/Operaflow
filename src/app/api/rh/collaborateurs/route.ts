import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isRHOrAdmin } from "@/lib/auth/rh-check";

// GET - Liste des collaborateurs
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const hasRHAccess = await isRHOrAdmin(user.id);
    const searchParams = new URL(request.url).searchParams;
    const site = searchParams.get("site");
    const statut = searchParams.get("statut");
    const userId = searchParams.get("user_id"); // Nouveau paramètre pour chercher par user_id

    let query = supabase
      .from("collaborateurs")
      .select(`
        *,
        responsable:collaborateurs!collaborateurs_responsable_id_fkey(id, nom, prenom, email),
        user:user_id(id, email)
      `);

    if (userId) {
      // Chercher par user_id (pour tous les utilisateurs)
      query = query.eq("user_id", userId);
    } else if (!hasRHAccess) {
      // Les non-RH voient seulement leur propre fiche
      query = query.eq("user_id", user.id);
    } else {
      // RH/Admin peuvent filtrer
      if (site) query = query.eq("site", site);
      if (statut) query = query.eq("statut", statut);
    }

    const { data, error } = await query.order("nom", { ascending: true });

    if (error) {
      console.error("Erreur récupération collaborateurs:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur GET collaborateurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer un collaborateur
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const hasRHAccess = await isRHOrAdmin(user.id);
    if (!hasRHAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();

    // Définir uniquement les colonnes qui existent dans la table collaborateurs selon le schéma
    // Colonnes valides: id, user_id, nom, prenom, email, telephone, site, site_id, responsable_id, 
    // responsable_activite_id, fonction_metier, type_contrat, date_embauche, date_fin_contrat,
    // statut, competence_principale_id, competence_secondaire_ids, commentaire, created_at, updated_at, created_by, updated_by
    const allowedFields = [
      'id', 'user_id', 'nom', 'prenom', 'email', 'telephone', 
      'site', 'site_id', 'responsable_id', 'responsable_activite_id', 
      'fonction_metier', 'type_contrat', 'date_embauche', 'date_fin_contrat',
      'statut', 'competence_principale_id', 'competence_secondaire_ids', 
      'commentaire'
    ];

    // Construire l'objet avec uniquement les champs autorisés
    const collaborateurData: Record<string, unknown> = {
      created_by: user.id,
      updated_by: user.id,
    };

    // Filtrer et nettoyer les champs
    allowedFields.forEach((key) => {
      const value = body[key];
      if (value !== undefined && value !== null && value !== "") {
        collaborateurData[key] = value;
      } else if (key === 'statut' && !value) {
        // statut a une valeur par défaut mais on peut le définir explicitement
        collaborateurData[key] = 'actif';
      }
    });

    // Si responsable_activite_id n'est pas fourni mais que site_id l'est, déterminer automatiquement
    if (!collaborateurData.responsable_activite_id && collaborateurData.site_id) {
      const { data: responsableData, error: responsableError } = await supabase
        .rpc('get_responsable_activite_site', {
          p_site_id: collaborateurData.site_id
        });
      
      if (!responsableError && responsableData) {
        collaborateurData.responsable_activite_id = responsableData;
      }
    }

    const { data, error } = await supabase
      .from("collaborateurs")
      .insert(collaborateurData)
      .select()
      .single();

    if (error) {
      console.error("Erreur création collaborateur:", error);
      console.error("Données envoyées:", JSON.stringify(collaborateurData, null, 2));
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erreur POST collaborateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

