import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/affaires/[id]/pre-planif/validate
 * Valide la pré-planification et change le statut de l'affaire à "pre_planifie"
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

    // Vérifier les permissions : Planificateur ou Responsable d'Activité ou Admin
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

    // Vérifier que la pré-planification existe
    const { data: prePlanif, error: prePlanifError } = await clientToUse
      .from("tbl_affaires_pre_planif")
      .select("id")
      .eq("affaire_id", id)
      .maybeSingle();

    if (prePlanifError || !prePlanif) {
      return NextResponse.json(
        { error: "Pré-planification non trouvée. Veuillez d'abord sauvegarder la pré-planification." },
        { status: 404 }
      );
    }

    // Mettre à jour la pré-planification avec la validation
    const { error: updatePrePlanifError } = await clientToUse
      .from("tbl_affaires_pre_planif")
      .update({
        valide_par: user.id,
        date_validation: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", prePlanif.id);

    if (updatePrePlanifError) {
      console.error("Erreur validation pré-planif:", updatePrePlanifError);
      return NextResponse.json(
        { error: "Erreur lors de la validation" },
        { status: 500 }
      );
    }

    // Mettre à jour le statut de l'affaire
    const { error: updateAffaireError } = await clientToUse
      .from("tbl_affaires")
      .update({
        statut: "pre_planifie",
        date_pre_planif: new Date().toISOString().split("T")[0],
        pre_planifie_par: user.id,
        updated_by: user.id,
      })
      .eq("id", id);

    if (updateAffaireError) {
      console.error("Erreur mise à jour statut affaire:", updateAffaireError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du statut" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API validation pré-planif:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

