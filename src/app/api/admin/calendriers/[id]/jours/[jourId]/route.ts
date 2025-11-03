import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH - Modifier un jour
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jourId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name === "Administrateur";
    });

    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { jourId } = await params;
    const body = await request.json();
    const { type_jour, heures_travail, libelle, est_recurrent } = body;

    const updates: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (type_jour !== undefined) updates.type_jour = type_jour;
    if (heures_travail !== undefined) updates.heures_travail = heures_travail;
    if (libelle !== undefined) updates.libelle = libelle?.trim() || null;
    if (est_recurrent !== undefined) updates.est_recurrent = est_recurrent;

    const { data, error } = await supabase
      .from("tbl_calendrier_jours")
      .update(updates)
      .eq("id", jourId)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour jour:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    return NextResponse.json({ jour: data });
  } catch (error) {
    console.error("Erreur PATCH jour calendrier:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un jour
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jourId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some((ur) => {
      const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
      return role?.name === "Administrateur";
    });

    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { jourId } = await params;

    const { error } = await supabase
      .from("tbl_calendrier_jours")
      .delete()
      .eq("id", jourId);

    if (error) {
      console.error("Erreur suppression jour:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE jour calendrier:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

