import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer tous les templates
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: templates, error } = await supabase
      .from("tbl_planification_templates")
      .select(`
        *,
        taches:tbl_planification_template_taches(*)
      `)
      .eq("actif", true)
      .order("nom_template", { ascending: true });

    if (error) {
      console.error("Erreur lors de la récupération des templates:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] }, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer un nouveau template
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
    const { nom_template, description, categorie, taches } = body;

    if (!nom_template) {
      return NextResponse.json(
        { error: "Le nom du template est requis" },
        { status: 400 }
      );
    }

    // Créer le template
    const { data: template, error: templateError } = await supabase
      .from("tbl_planification_templates")
      .insert({
        nom_template,
        description: description || null,
        categorie: categorie || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (templateError || !template) {
      console.error("Erreur lors de la création du template:", templateError);
      return NextResponse.json(
        { error: "Erreur lors de la création du template" },
        { status: 500 }
      );
    }

    // Créer les tâches du template si fournies
    if (taches && Array.isArray(taches) && taches.length > 0) {
      const tachesToInsert = taches.map((tache: { libelle: string; description?: string; duree_jours_ouvres?: number; type_horaire?: string; heures_prevues?: number; parent_template_tache_id?: string; numero_hierarchique?: string; niveau_hierarchie?: number; ordre_affichage?: number; tache_precedente_id?: string; type_dependance?: string }) => ({
        template_id: template.id,
        parent_template_tache_id: tache.parent_template_tache_id || null,
        numero_hierarchique: tache.numero_hierarchique || null,
        niveau_hierarchie: tache.niveau_hierarchie || 0,
        ordre_affichage: tache.ordre_affichage || 0,
        libelle: tache.libelle,
        description: tache.description || null,
        duree_jours_ouvres: tache.duree_jours_ouvres || null,
        type_horaire: tache.type_horaire || "jour",
        heures_prevues: tache.heures_prevues || 0,
        tache_precedente_id: tache.tache_precedente_id || null,
        type_dependance: tache.type_dependance || null,
      }));

      const { error: tachesError } = await supabase
        .from("tbl_planification_template_taches")
        .insert(tachesToInsert);

      if (tachesError) {
        console.error("Erreur lors de la création des tâches:", tachesError);
        // Ne pas échouer complètement, le template est créé
      }
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}
