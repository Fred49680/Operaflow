import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST - Créer un lot pour une affaire
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
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

    // Vérifier que l'affaire existe
    const { data: affaire } = await clientToUse
      .from("tbl_affaires")
      .select("id, montant_total")
      .eq("id", id)
      .maybeSingle();

    if (!affaire) {
      return NextResponse.json(
        { error: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    // Calculer le montant alloué si non fourni mais que pourcentage et montant_total sont disponibles
    let montantAlloue = body.montant_alloue;
    if (!montantAlloue && body.pourcentage_total && affaire.montant_total) {
      montantAlloue = (affaire.montant_total * body.pourcentage_total) / 100;
    }

    // Insérer le lot
    const { data: lotData, error: lotError } = await clientToUse
      .from("tbl_affaires_lots")
      .insert({
        affaire_id: id,
        numero_lot: body.numero_lot,
        libelle_lot: body.libelle_lot,
        description: body.description || null,
        pourcentage_total: body.pourcentage_total,
        montant_alloue: montantAlloue || null,
        est_jalon_gantt: body.est_jalon_gantt || false,
        date_debut_previsionnelle: body.date_debut_previsionnelle || null,
        date_fin_previsionnelle: body.date_fin_previsionnelle || null,
        ordre_affichage: body.ordre_affichage || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (lotError) {
      console.error("Erreur création lot:", lotError);
      return NextResponse.json(
        { error: lotError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(lotData, { status: 201 });
  } catch (error) {
    console.error("Erreur POST lot:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

