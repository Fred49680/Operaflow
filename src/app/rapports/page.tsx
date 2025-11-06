import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth/middleware";
import RapportsClient from "./rapports-client";

export default async function RapportsPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérifier les rôles (Conducteur, Responsable d'Affaire, Admin)
  const userRoles = await getUserRoles(user.id);
  const hasAccesRapports = userRoles.some((role) => {
    const roleStr = role as string;
    return roleStr === "Conducteur de travaux" || 
           roleStr === "Responsable d'Affaire" ||
           roleStr === "Administrateur";
  });

  if (!hasAccesRapports) {
    redirect("/dashboard");
  }

  return <RapportsClient userRoles={userRoles} />;
}

