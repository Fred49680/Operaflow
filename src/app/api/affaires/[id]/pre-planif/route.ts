import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/affaires/[id]/pre-planif
 * Récupère la pré-planification d'une affaire
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )
      : null;

    const clientToUse = supabaseAdmin || supabase;

    const { data: prePlanif, error } = await clientToUse
      .from("tbl_affaires_pre_planif")
      .select("*")
      .eq("affaire_id", id)
      .maybeSingle();

    if (error) {
      console.error("Erreur récupération pré-planif:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(prePlanif || null);
  } catch (error) {
    console.error("Erreur API pré-planif GET:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/affaires/[id]/pre-planif
 * Crée ou met à jour la pré-planification d'une affaire
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier les permissions : Planificateur ou Responsable d'Activité ou Admin
    const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        )
      : null;

    const clientToUse = supabaseAdmin || supabase;

    const { data: userRoles } = await clientToUse
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    if (!userRoles || userRoles.length === 0) {
      return NextResponse.json(
        { error: "Permissions insuffisantes" },
        { status: 403 }
      );
    }

    const hasPermission = userRoles.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      const roleName = role?.name?.toLowerCase() || "";
      return (
        roleName === "administrateur" ||
        roleName.includes("planificateur") ||
        roleName.includes("responsable d'activité") ||
        roleName.includes("responsable")
      );
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Permissions insuffisantes. Rôles requis : Planificateur ou Responsable d'Activité" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Vérifier que l'affaire existe
    const { data: affaire, error: affaireError } = await clientToUse
      .from("tbl_affaires")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (affaireError || !affaire) {
      return NextResponse.json(
        { error: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier si une pré-planification existe déjà
    const { data: existingPrePlanif } = await clientToUse
      .from("tbl_affaires_pre_planif")
      .select("id")
      .eq("affaire_id", id)
      .maybeSingle();

    const prePlanifData = {
      affaire_id: id,
      total_jours_homme: body.total_jours_homme ? parseFloat(body.total_jours_homme) : null,
      total_heures: body.total_heures ? parseFloat(body.total_heures) : null,
      contraintes_calendrier: body.contraintes_calendrier || null,
      contraintes_techniques: body.contraintes_techniques || null,
      contraintes_rh: body.contraintes_rh || null,
      risques: body.risques || null,
      commentaire: body.commentaire || null,
      besoins_competences: body.besoins_competences || null,
      besoins_habilitations: body.besoins_habilitations || null,
      ressources_estimees: body.ressources_estimees || null,
      charge_par_competence: body.charge_par_competence || null,
      updated_by: user.id,
    };

    let result;
    if (existingPrePlanif) {
      // Mise à jour
      const { data, error } = await clientToUse
        .from("tbl_affaires_pre_planif")
        .update(prePlanifData)
        .eq("id", existingPrePlanif.id)
        .select()
        .single();

      if (error) {
        console.error("Erreur mise à jour pré-planif:", error);
        return NextResponse.json(
          { error: "Erreur lors de la mise à jour" },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Création
      const { data, error } = await clientToUse
        .from("tbl_affaires_pre_planif")
        .insert({
          ...prePlanifData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création pré-planif:", error);
        return NextResponse.json(
          { error: "Erreur lors de la création" },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur API pré-planif POST:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

