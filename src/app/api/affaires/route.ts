import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// GET - Liste des affaires
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const statut = searchParams.get("statut");
    const siteId = searchParams.get("site_id");
    const client = searchParams.get("client");

    // Utiliser le service role key pour bypasser RLS si disponible
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

    let query = clientToUse
      .from("tbl_affaires")
      .select(`
        *,
        charge_affaires:collaborateurs!tbl_affaires_charge_affaires_id_fkey(id, nom, prenom),
        site:tbl_sites!tbl_affaires_site_id_fkey(site_id, site_code, site_label),
        partenaire:tbl_partenaires!tbl_affaires_partenaire_id_fkey(id, raison_sociale, type_partenaire),
        contact:tbl_partenaire_contacts!tbl_affaires_contact_id_fkey(id, nom, prenom, email)
      `);

    if (statut) query = query.eq("statut", statut);
    if (siteId) query = query.eq("site_id", siteId);
    if (client) query = query.ilike("client", `%${client}%`);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur récupération affaires:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Erreur GET affaires:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Créer une affaire
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier les droits (Chargé d'affaires, Responsable d'activité, Admin, RH)
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
    const { bpu, depenses, lots, ...affaireData } = body;

    // Générer un numéro automatique si non fourni
    if (!affaireData.numero) {
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("tbl_affaires")
        .select("*", { count: "exact", head: true })
        .like("numero", `${year}-%`);
      
      const nextNum = ((count || 0) + 1).toString().padStart(4, "0");
      affaireData.numero = `${year}-${nextNum}`;
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

    // Créer l'affaire
    const { data: affaire, error: affaireError } = await clientToUse
      .from("tbl_affaires")
      .insert({
        ...affaireData,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (affaireError) {
      console.error("Erreur création affaire:", affaireError);
      return NextResponse.json(
        { error: affaireError.message },
        { status: 400 }
      );
    }

    // Créer les lignes BPU si fournies
    if (affaire && bpu && Array.isArray(bpu) && bpu.length > 0) {
      const bpuData = bpu.map((ligne: Record<string, unknown>) => ({
        ...ligne,
        affaire_id: affaire.id,
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: bpuError } = await clientToUse
        .from("tbl_affaires_bpu")
        .insert(bpuData);

      if (bpuError) {
        console.error("Erreur création BPU:", bpuError);
      }
    }

    // Créer les dépenses si fournies
    if (affaire && depenses && Array.isArray(depenses) && depenses.length > 0) {
      const depensesData = depenses.map((dep: Record<string, unknown>) => ({
        ...dep,
        affaire_id: affaire.id,
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: depError } = await clientToUse
        .from("tbl_affaires_depenses")
        .insert(depensesData);

      if (depError) {
        console.error("Erreur création dépenses:", depError);
      }
    }

    // Créer les lots si fournis
    if (affaire && lots && Array.isArray(lots) && lots.length > 0) {
      const lotsData = lots.map((lot: Record<string, unknown>) => ({
        ...lot,
        affaire_id: affaire.id,
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: lotsError } = await clientToUse
        .from("tbl_affaires_lots")
        .insert(lotsData);

      if (lotsError) {
        console.error("Erreur création lots:", lotsError);
      }
    }

    return NextResponse.json(affaire, { status: 201 });
  } catch (error) {
    console.error("Erreur POST affaire:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

