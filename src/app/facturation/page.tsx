import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth/middleware";
import FacturationClient from "./facturation-client";

export default async function FacturationPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier les rôles (Conducteur de travaux, Responsable d'Affaire, Administratif/Compta, Admin)
  const userRoles = await getUserRoles(user.id);
  const hasAccesFacturation = userRoles.some((role) => {
    const roleStr = role as string;
    return roleStr === "Conducteur de travaux" || 
           roleStr === "Responsable d'Affaire" ||
           roleStr === "Administrateur";
  });

  if (!hasAccesFacturation) {
    redirect("/dashboard");
  }

  // Charger les affaires pour filtres
  const { data: affaires } = await supabase
    .from("tbl_affaires")
    .select("id, numero, libelle, type_valorisation")
    .order("numero");

  return (
    <FacturationClient 
      affaires={affaires || []}
      userRoles={userRoles}
    />
  );
}

