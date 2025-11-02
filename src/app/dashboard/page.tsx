import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Récupérer les informations utilisateur
  const { data: userData } = await supabase
    .from("tbl_users")
    .select("*, roles(name, description)")
    .eq("id", user.id)
    .single();

  // Récupérer les rôles de l'utilisateur
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name, description)")
    .eq("user_id", user.id);

  // Extraire les rôles (Supabase retourne un tableau pour les jointures)
  const roles = userRoles?.map((ur) => {
    const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    return role;
  }).filter(Boolean) || [];

  // Compter les demandes en attente (si admin)
  const isAdmin = roles.some((r) => {
    const role = Array.isArray(r) ? r[0] : r;
    return role?.name === "Administrateur";
  });
  let pendingRequestsCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("tbl_user_requests")
      .select("*", { count: "exact", head: true })
      .eq("statut", "en_attente");
    pendingRequestsCount = count || 0;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Tableau de bord OperaFlow
          </h1>
          <p className="text-lg text-secondary">
            Bienvenue, {userData?.email || user.email}
          </p>
        </div>

        {pendingRequestsCount > 0 && (
          <div className="mb-6 card bg-accent-light/10 border border-accent">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="bg-accent text-white rounded-full px-3 py-1 text-sm font-semibold mr-3">
                  {pendingRequestsCount}
                </span>
                <span className="text-secondary font-medium">
                  Demande{pendingRequestsCount > 1 ? "s" : ""} d&apos;accès en attente
                </span>
              </div>
              <Link href="/admin/users" className="btn-accent">
                Voir les demandes
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Carte Rôles */}
          <div className="card border-l-4 border-l-primary bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Mes rôles
            </h2>
            {roles.length > 0 ? (
              <ul className="space-y-2">
                {roles.map((role, index) => {
                  const roleObj = Array.isArray(role) ? role[0] : role;
                  return (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                      <span className="text-gray-700">{roleObj?.name}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500">Aucun rôle attribué</p>
            )}
          </div>

          {/* Carte Statut */}
          <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Statut du compte
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Statut :</span>
                <span
                  className={`font-semibold ${
                    userData?.statut === "actif"
                      ? "text-green-600"
                      : userData?.statut === "en_attente"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {userData?.statut || "Non défini"}
                </span>
              </div>
              {userData?.derniere_connexion && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière connexion :</span>
                  <span className="text-gray-700">
                    {new Date(userData.derniere_connexion).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Carte Actions rapides */}
          <div className="card border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Actions rapides
            </h2>
            <div className="space-y-2">
              <Link href="/profile" className="block btn-primary text-center">
                Mon profil
              </Link>
              {isAdmin && (
                <>
                  <Link href="/admin/users" className="block btn-secondary text-center">
                    Gérer les utilisateurs
                  </Link>
                  <Link href="/admin/roles" className="block btn-secondary text-center">
                    Gérer les rôles
                  </Link>
                  <Link href="/admin/audit" className="block btn-secondary text-center">
                    Journal d'audit
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modules disponibles selon les rôles */}
        <div className="mt-8 card border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-white">
          <h2 className="text-xl font-semibold text-secondary mb-4">
            Modules disponibles
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(isAdmin ||
              roles.some((r) => {
                const roleObj = Array.isArray(r) ? r[0] : r;
                return roleObj?.name === "Administratif RH";
              })) && (
              <Link href="/rh" className="card hover:shadow-cardHover text-center">
                <h3 className="font-semibold text-secondary">RH Collaborateurs</h3>
              </Link>
            )}
            {(isAdmin ||
              roles.some((r) => {
                const roleObj = Array.isArray(r) ? r[0] : r;
                return roleObj?.name === "Responsable d'Activité" || roleObj?.name === "Chargé d'Affaires";
              })) && (
              <Link href="/affaires" className="card hover:shadow-cardHover text-center">
                <h3 className="font-semibold text-secondary">Affaires</h3>
              </Link>
            )}
            {(isAdmin ||
              roles.some((r) => {
                const roleObj = Array.isArray(r) ? r[0] : r;
                return roleObj?.name === "Planificateur" || roleObj?.name === "Responsable d'Activité";
              })) && (
              <Link href="/planification" className="card hover:shadow-cardHover text-center">
                <h3 className="font-semibold text-secondary">Planification</h3>
              </Link>
            )}
            <Link href="/kpi" className="card hover:shadow-cardHover text-center">
              <h3 className="font-semibold text-secondary">KPI & Alertes</h3>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

