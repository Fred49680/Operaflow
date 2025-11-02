import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import * as XLSX from "xlsx";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST - Importer BPU depuis Excel
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
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!affaire) {
      return NextResponse.json(
        { error: "Affaire non trouvée" },
        { status: 404 }
      );
    }

    // Récupérer le fichier
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Lire le fichier
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    
    // Prendre la première feuille
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convertir en JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (data.length < 2) {
      return NextResponse.json(
        { error: "Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données" },
        { status: 400 }
      );
    }

    // Trouver les colonnes (première ligne = en-têtes)
    const headers = data[0].map((h: any) => String(h || "").toLowerCase().trim());
    
    // Mapping flexible des colonnes
    const findColumnIndex = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => 
          h.includes(name.toLowerCase()) || 
          name.toLowerCase().includes(h)
        );
        if (index !== -1) return index;
      }
      return -1;
    };

    const codeIndex = findColumnIndex(["code", "code bpu", "code_bpu", "référence", "reference"]);
    const libelleIndex = findColumnIndex(["libellé", "libelle", "description", "nom"]);
    const uniteIndex = findColumnIndex(["type", "unité", "unite", "unit", "u"]);
    const puIndex = findColumnIndex(["pu", "prix unitaire", "prix_unitaire", "prix", "price"]);
    const quantiteIndex = findColumnIndex(["quantité", "quantite", "quantity", "qte", "qty"]);

    if (codeIndex === -1 || libelleIndex === -1 || puIndex === -1) {
      return NextResponse.json(
        { error: "Colonnes requises non trouvées. Veuillez vérifier que le fichier contient : Code BPU, Libellé et PU" },
        { status: 400 }
      );
    }

    // Parser les lignes
    const bpuLignes = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const codeBpu = row[codeIndex] ? String(row[codeIndex]).trim() : null;
      const libelle = row[libelleIndex] ? String(row[libelleIndex]).trim() : null;
      const unite = uniteIndex !== -1 && row[uniteIndex] ? String(row[uniteIndex]).trim() : null;
      const pu = row[puIndex] ? parseFloat(String(row[puIndex]).replace(",", ".")) : null;
      const quantite = quantiteIndex !== -1 && row[quantiteIndex] ? parseFloat(String(row[quantiteIndex]).replace(",", ".")) : 1;

      if (!codeBpu || !libelle || pu === null || isNaN(pu)) {
        continue; // Ignorer les lignes incomplètes
      }

      bpuLignes.push({
        code_bpu: codeBpu,
        libelle_bpu: libelle,
        unite: unite || null,
        prix_unitaire_ht: pu,
        quantite_prevue: quantite || 1,
        quantite_reelle: null,
        montant_total_ht: (pu || 0) * (quantite || 1),
        ordre_affichage: i,
        affaire_id: id,
        created_by: user.id,
        updated_by: user.id,
      });
    }

    if (bpuLignes.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne BPU valide trouvée dans le fichier" },
        { status: 400 }
      );
    }

    // Insérer les lignes BPU (remplacer les existantes)
    // Supprimer les anciennes lignes
    await clientToUse
      .from("tbl_affaires_bpu")
      .delete()
      .eq("affaire_id", id);

    // Insérer les nouvelles lignes
    const { data: insertedData, error: insertError } = await clientToUse
      .from("tbl_affaires_bpu")
      .insert(bpuLignes)
      .select();

    if (insertError) {
      console.error("Erreur insertion BPU:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      count: insertedData?.length || 0,
      data: insertedData 
    });
  } catch (error) {
    console.error("Erreur import BPU:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

