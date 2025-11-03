import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// PATCH - Modifier un calendrier
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { libelle, description, site_id, actif, annee_reference } = body;

    const updates: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (libelle !== undefined) updates.libelle = libelle.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (site_id !== undefined) updates.site_id = site_id || null;
    if (actif !== undefined) updates.actif = actif;
    if (annee_reference !== undefined) updates.annee_reference = annee_reference || null;

    const { data, error } = await supabase
      .from("tbl_calendriers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour calendrier:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    return NextResponse.json({ calendrier: data });
  } catch (error) {
    console.error("Erreur PATCH calendriers:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un calendrier
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Supprimer les jours du calendrier d'abord (CASCADE devrait le faire automatiquement)
    const { error: deleteJoursError } = await supabase
      .from("tbl_calendrier_jours")
      .delete()
      .eq("calendrier_id", id);

    if (deleteJoursError) {
      console.error("Erreur suppression jours:", deleteJoursError);
    }

    // Supprimer le calendrier
    const { error } = await supabase
      .from("tbl_calendriers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erreur suppression calendrier:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE calendriers:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

