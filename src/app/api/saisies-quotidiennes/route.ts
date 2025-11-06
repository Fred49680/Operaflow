import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET : Récupérer les saisies quotidiennes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    
    const searchParams = new URL(request.url).searchParams;
    const activiteId = searchParams.get("activite_id");
    const collaborateurId = searchParams.get("collaborateur_id");
    const affaireId = searchParams.get("affaire_id");
    const dateSaisie = searchParams.get("date_saisie");
    const limit = searchParams.get("limit");
    
    let query = supabase
      .from("tbl_saisies_quotidiennes")
      .select(`
        *,
        activite:tbl_activites_terrain!tbl_saisies_quotidiennes_activite_id_fkey(id, libelle, statut),
        collaborateur:collaborateurs!tbl_saisies_quotidiennes_collaborateur_id_fkey(id, nom, prenom),
        affaire:tbl_affaires!tbl_saisies_quotidiennes_affaire_id_fkey(id, numero, libelle)
      `)
      .order("date_saisie", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (activiteId) {
      query = query.eq("activite_id", activiteId);
    }
    
    if (collaborateurId) {
      query = query.eq("collaborateur_id", collaborateurId);
    }
    
    if (affaireId) {
      query = query.eq("affaire_id", affaireId);
    }
    
    if (dateSaisie) {
      query = query.eq("date_saisie", dateSaisie);
    }
    
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Erreur récupération saisies:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ saisies: data || [] });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

// POST : Créer une saisie quotidienne
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
    const {
      activite_id,
      collaborateur_id,
      user_id, // Optionnel : pour créer le collaborateur si nécessaire
      affaire_id,
      date_saisie,
      statut_jour,
      motif_report,
      motif_report_id,
      commentaire,
    } = body;
    
    if (!activite_id || !affaire_id || !date_saisie || !statut_jour) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }
    
    // Si pas de collaborateur_id mais user_id fourni, créer ou récupérer le collaborateur
    let collaborateurIdFinal = collaborateur_id;
    if (!collaborateurIdFinal && user_id) {
      // Vérifier si un collaborateur existe déjà pour cet user_id
      const { data: existingCollab } = await supabase
        .from("collaborateurs")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();
      
      if (existingCollab) {
        collaborateurIdFinal = existingCollab.id;
      } else {
        // Créer un collaborateur minimal pour l'utilisateur
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          const { data: newCollab, error: collabError } = await supabase
            .from("collaborateurs")
            .insert({
              user_id: user_id,
              nom: userData.user.email.split("@")[0].split(".").pop() || "Admin",
              prenom: userData.user.email.split("@")[0].split(".")[0] || "Admin",
              email: userData.user.email,
              statut: "actif",
              created_by: user.id,
              updated_by: user.id,
            })
            .select("id")
            .single();
          
          if (collabError || !newCollab) {
            console.error("Erreur création collaborateur:", collabError);
            return NextResponse.json(
              { error: "Impossible de créer le collaborateur. Veuillez contacter l'administrateur." },
              { status: 500 }
            );
          }
          
          collaborateurIdFinal = newCollab.id;
        } else {
          return NextResponse.json(
            { error: "Impossible de récupérer les informations utilisateur" },
            { status: 400 }
          );
        }
      }
    }
    
    if (!collaborateurIdFinal) {
      return NextResponse.json(
        { error: "collaborateur_id est requis" },
        { status: 400 }
      );
    }
    
    // Vérifier qu'il n'y a pas déjà une saisie "realise" pour cette activité ce jour
    if (statut_jour === "realise") {
      const { data: existingSaisie } = await supabase
        .from("tbl_saisies_quotidiennes")
        .select("id")
        .eq("activite_id", activite_id)
        .eq("date_saisie", date_saisie)
        .eq("statut_jour", "realise")
        .single();
      
      if (existingSaisie) {
        return NextResponse.json(
          { error: "Une saisie 'Réalisé' existe déjà pour cette activité aujourd'hui" },
          { status: 400 }
        );
      }
    }
    
    const { data: saisie, error } = await supabase
      .from("tbl_saisies_quotidiennes")
      .insert({
        activite_id,
        collaborateur_id: collaborateurIdFinal,
        affaire_id,
        date_saisie,
        statut_jour,
        motif_report: statut_jour === "reporte" ? (motif_report || null) : null,
        motif_report_id: statut_jour === "reporte" ? (motif_report_id || null) : null,
        commentaire: commentaire || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Erreur création saisie:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la création" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ saisie }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    );
  }
}

