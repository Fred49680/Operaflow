import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST - Téléverser un document pour une affaire
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

    // Vérifier que l'affaire existe
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

    const { data: affaire } = await clientToUse
      .from("tbl_affaires")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!affaire) {
      return NextResponse.json(
        { error: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    // Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const typeDocument = formData.get("type_document") as string;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (50 MB max)
    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux (max 50 MB)" },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `affaire-${id}-${timestamp}.${fileExtension}`;
    const filePath = `affaires/${id}/${fileName}`;

    // Uploader le fichier vers Supabase Storage
    const { data: uploadData, error: uploadError } = await clientToUse.storage
      .from("documents")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Erreur upload storage:", uploadError);
      return NextResponse.json(
        { error: "Erreur lors du téléversement du fichier" },
        { status: 500 }
      );
    }

    // Récupérer l'URL publique du fichier
    const {
      data: { publicUrl },
    } = clientToUse.storage.from("documents").getPublicUrl(filePath);

    // Insérer l'enregistrement dans la table documents
    const { data: documentData, error: docError } = await clientToUse
      .from("tbl_affaires_documents")
      .insert({
        affaire_id: id,
        nom_fichier: file.name,
        type_document: typeDocument || null,
        url_storage: publicUrl,
        taille_octets: file.size,
        description: description || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      console.error("Erreur insertion document:", docError);
      // Supprimer le fichier uploadé en cas d'erreur
      await clientToUse.storage.from("documents").remove([filePath]);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement du document" },
        { status: 500 }
      );
    }

    return NextResponse.json(documentData, { status: 201 });
  } catch (error) {
    console.error("Erreur POST document:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

