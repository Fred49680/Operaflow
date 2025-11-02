import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string; lotId: string }>;
}

// PATCH - Mettre à jour un lot
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id, lotId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier les droits
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const hasAccess = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name && [
        "Administrateur",
        "Administratif RH",
        "RH",
        "Chargé d'Affaires",
        "Responsable d'Activité",
      ].includes(role.name);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();

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

    // Vérifier que le lot existe et appartient à l'affaire
    const { data: lot } = await clientToUse
      .from("tbl_affaires_lots")
      .select("id, affaire_id")
      .eq("id", lotId)
      .eq("affaire_id", id)
      .maybeSingle();

    if (!lot) {
      return NextResponse.json(
        { error: "Lot non trouvé" },
        { status: 404 }
      );
    }

    // Récupérer le montant total de l'affaire pour calculer montant_alloue si nécessaire
    const { data: affaire } = await clientToUse
      .from("tbl_affaires")
      .select("montant_total")
      .eq("id", id)
      .maybeSingle();

    // Calculer le montant alloué si non fourni mais que pourcentage et montant_total sont disponibles
    let montantAlloue = body.montant_alloue;
    if (!montantAlloue && body.pourcentage_total && affaire?.montant_total) {
      montantAlloue = (affaire.montant_total * body.pourcentage_total) / 100;
    }

    // Mettre à jour le lot
    const { data: lotData, error: lotError } = await clientToUse
      .from("tbl_affaires_lots")
      .update({
        numero_lot: body.numero_lot,
        libelle_lot: body.libelle_lot,
        description: body.description || null,
        pourcentage_total: body.pourcentage_total,
        montant_alloue: montantAlloue !== undefined ? montantAlloue : body.montant_alloue || null,
        est_jalon_gantt: body.est_jalon_gantt || false,
        date_debut_previsionnelle: body.date_debut_previsionnelle || null,
        date_fin_previsionnelle: body.date_fin_previsionnelle || null,
        ordre_affichage: body.ordre_affichage || null,
        updated_by: user.id,
      })
      .eq("id", lotId)
      .select()
      .single();

    if (lotError) {
      console.error("Erreur mise à jour lot:", lotError);
      return NextResponse.json(
        { error: lotError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(lotData);
  } catch (error) {
    console.error("Erreur PATCH lot:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un lot
export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id, lotId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier les droits
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const hasAccess = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name && [
        "Administrateur",
        "Administratif RH",
        "RH",
        "Chargé d'Affaires",
        "Responsable d'Activité",
      ].includes(role.name);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
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

    // Vérifier que le lot existe et appartient à l'affaire
    const { data: lot } = await clientToUse
      .from("tbl_affaires_lots")
      .select("id, affaire_id")
      .eq("id", lotId)
      .eq("affaire_id", id)
      .maybeSingle();

    if (!lot) {
      return NextResponse.json(
        { error: "Lot non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer le lot
    const { error: deleteError } = await clientToUse
      .from("tbl_affaires_lots")
      .delete()
      .eq("id", lotId);

    if (deleteError) {
      console.error("Erreur suppression lot:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE lot:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

