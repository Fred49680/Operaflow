import { createServerClient } from "@/lib/supabase/server";
import HeaderClient from "./HeaderClient";

/**
 * Wrapper sécurisé pour Header qui gère les erreurs
 */
export default async function SafeHeader() {
  try {
    // Vérifier que les variables d'environnement sont définies
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return null;
    }

    let supabase;
    try {
      supabase = await createServerClient();
    } catch {
      // Si la création du client échoue, ne pas afficher le header
      return null;
    }

    // Vérifier la session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null; // Pas de header si non connecté
    }

    // Récupérer les informations utilisateur (gérer les erreurs gracieusement)
    let userData = null;
    try {
      const { data, error } = await supabase
        .from("tbl_users")
        .select(`
          *,
          collaborateurs(nom, prenom)
        `)
        .eq("id", user.id)
        .maybeSingle();
      
      if (!error) {
        userData = data;
      }
    } catch {
      // Ignorer l'erreur silencieusement (utilisateur peut ne pas être dans tbl_users)
    }

    // Récupérer les rôles de l'utilisateur
    type UserRole = {
      roles?: { name: string; description?: string | null } | { name: string; description?: string | null }[] | null;
    };
    
    let userRoles: UserRole[] = [];
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("roles(name, description)")
        .eq("user_id", user.id);
      
      if (!error && data) {
        userRoles = data;
      }
    } catch {
      // Ignorer l'erreur, userRoles reste []
    }

    // Extraire les rôles
    const roles = userRoles
      .map((ur) => {
        const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
        return role;
      })
      .filter(Boolean);

    // Vérifier les permissions (avec gestion d'erreur)
    let isAdmin = false;
    let isRH = false;
    
    try {
      isAdmin = roles.some((r) => {
        const role = Array.isArray(r) ? r[0] : r;
        return role?.name === "Administrateur";
      });
      
      isRH = roles.some((r) => {
        const role = Array.isArray(r) ? r[0] : r;
        return role?.name === "RH";
      });
    } catch {
      // Ignorer l'erreur
    }

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
    // Utiliser des strings pour les icônes au lieu de composants React
    const menuItems = [
      {
        label: "Tableau de bord",
        href: "/dashboard",
        iconName: "LayoutDashboard",
        alwaysVisible: true,
      },
      {
        label: "Affaires",
        href: "/affaires",
        iconName: "Briefcase",
        visible: true,
      },
      {
        label: "Planification",
        href: "/planification",
        iconName: "Calendar",
        visible: true,
        comingSoon: true,
      },
      {
        label: "KPI & Alertes",
        href: "/kpi",
        iconName: "BarChart3",
        visible: true,
        comingSoon: true,
      },
    ];

    // Menu RH avec sous-menu (pour utilisateurs avec accès RH)
    const rhItems = (isRH || isAdmin)
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
            {
              label: "Alertes Documents",
              href: "/admin/partenaires/alertes",
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
  } catch (error) {
    // En cas d'erreur, ne pas afficher le header plutôt que de crasher
    // Logger l'erreur pour diagnostic
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Erreur dans SafeHeader:", {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    
    // Retourner null pour éviter de casser l'application
    return null;
  }
}

