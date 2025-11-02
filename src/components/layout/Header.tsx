import { createServerClient } from "@/lib/supabase/server";
import { isRHOrAdmin } from "@/lib/auth/rh-check";
import HeaderClient from "./HeaderClient";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  BarChart3,
} from "lucide-react";

export default async function Header() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // Pas de header si non connecté
  }

  // Récupérer les informations utilisateur (gérer les erreurs gracieusement)
  const { data: userData } = await supabase
    .from("tbl_users")
    .select(`
      *,
      collaborateurs(nom, prenom)
    `)
    .eq("id", user.id)
    .maybeSingle();
  
  // Ignorer les erreurs silencieusement (utilisateur peut ne pas être dans tbl_users)

  // Récupérer les rôles de l'utilisateur
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name, description)")
    .eq("user_id", user.id);

  // Extraire les rôles
  const roles = userRoles?.map((ur) => {
    const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return role;
  }).filter(Boolean) || [];

  // Vérifier les permissions
  const isAdmin = roles.some((r) => {
    const role = Array.isArray(r) ? r[0] : r;
    return role?.name === "Administrateur";
  });
  const hasRHAccess = await isRHOrAdmin(user.id);

  // Nom d'affichage (gérer les cas où collaborateurs peut être null ou un tableau)
  let displayName = userData?.email || user.email || "Utilisateur";
  if (userData?.collaborateurs) {
    const collab = Array.isArray(userData.collaborateurs) 
      ? userData.collaborateurs[0] 
      : userData.collaborateurs;
    if (collab && typeof collab === 'object' && 'prenom' in collab && 'nom' in collab) {
      displayName = `${collab.prenom} ${collab.nom}`;
    }
  }

  // Construction du menu selon les rôles
  const menuItems = [
    {
      label: "Tableau de bord",
      href: "/dashboard",
      icon: LayoutDashboard,
      alwaysVisible: true,
    },
    {
      label: "RH Collaborateurs",
      href: "/rh",
      icon: Users,
      visible: true, // Tous les utilisateurs peuvent voir leur fiche
      badge: hasRHAccess ? undefined : undefined,
    },
    {
      label: "Affaires",
      href: "/affaires",
      icon: Briefcase,
      visible: true,
    },
    {
      label: "Planification",
      href: "/planification",
      icon: Calendar,
      visible: true,
    },
    {
      label: "KPI & Alertes",
      href: "/kpi",
      icon: BarChart3,
      visible: true,
      comingSoon: true,
    },
  ];

  // Menu admin
  const adminItems = isAdmin
    ? [
        {
          label: "Administration",
          iconName: "Settings",
          submenu: [
            {
              label: "Utilisateurs",
              href: "/admin/users",
            },
            {
              label: "Rôles",
              href: "/admin/roles",
            },
            {
              label: "Journal d'audit",
              href: "/admin/audit",
            },
            {
              label: "Catalogue Absences",
              href: "/admin/absences",
            },
            {
              label: "Référentiel Sites",
              href: "/rh/sites",
            },
            {
              label: "Fonctions Métier",
              href: "/admin/fonctions-metier",
            },
            {
              label: "Catalogue Formations",
              href: "/admin/formations/catalogue",
            },
            {
              label: "Partenaires",
              href: "/admin/partenaires",
            },
          ],
        },
      ]
    : [];

  // Menu RH avec sous-menu pour les absences et formations
  const rhItems = hasRHAccess
    ? [
        {
          label: "RH",
          iconName: "Users",
          submenu: [
            {
              label: "Collaborateurs",
              href: "/rh",
            },
            {
              label: "Mes Demandes",
              href: "/absences/demandes",
            },
            {
              label: "Validations",
              href: "/absences/validation",
            },
            {
              label: "Suivi Absences",
              href: "/absences/suivi",
            },
          ],
        },
        {
          label: "Formations",
          iconName: "GraduationCap",
          submenu: [
            {
              label: "Plan Prévisionnel",
              href: "/formations/plan-previsionnel",
            },
            {
              label: "Plan de Formation",
              href: "/formations/plan-formation",
            },
            {
              label: "Suivi & Pilotage",
              href: "/formations/suivi",
            },
          ],
        },
      ]
    : [];

  return (
    <HeaderClient
      user={{
        id: user.id,
        email: user.email || "",
        displayName,
        avatar: null,
      }}
      menuItems={menuItems}
      rhItems={rhItems}
      adminItems={adminItems}
      isAdmin={isAdmin}
    />
  );
}

