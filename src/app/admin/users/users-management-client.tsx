"use client";

import { useState } from "react";
import { createClientSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["tbl_users"]["Row"] & {
  user_roles?: Array<{
    roles?: { name: string; description: string | null } | null;
    site_id?: string | null;
  }> | null;
  collaborateurs?: { nom: string; prenom: string } | null;
};

type UserRequest = Database["public"]["Tables"]["tbl_user_requests"]["Row"];
type Role = Database["public"]["Tables"]["roles"]["Row"];

type Site = {
  site_id: string;
  site_code: string;
  site_label: string;
};

interface Props {
  users: User[];
  pendingRequests: UserRequest[];
  roles: Role[];
  sites: Site[];
}

export default function UsersManagementClient({
  users,
  pendingRequests,
  roles,
  sites,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "requests">("requests");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState<UserRequest | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);


  const handleAcceptRequest = async (request: UserRequest) => {
    setShowAcceptModal(request);
    setSelectedRoleId(roles[0]?.id || ""); // Réinitialiser avec le premier rôle
    setSelectedSiteIds([]); // Réinitialiser les sélections de sites
  };

  const handleToggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const confirmAcceptRequest = async () => {
    if (!showAcceptModal || !selectedRoleId) {
      setError("Veuillez sélectionner un rôle");
      return;
    }

    setLoading(showAcceptModal.id);
    setError(null);

    try {
      const supabase = createClientSupabase();

      // Générer un mot de passe provisoire
      const passwordResponse = await fetch("/api/auth/generate-password", {
        method: "POST",
      });
      const { password } = await passwordResponse.json();

      // Créer le compte dans auth.users via Supabase Admin API (nécessite service role)
      // Pour l'instant, on utilisera une route API server-side
      const createResponse = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: showAcceptModal.email,
          password,
          nom: showAcceptModal.nom,
          prenom: showAcceptModal.prenom,
          role_id: selectedRoleId,
          site_ids: selectedSiteIds, // Envoyer un tableau de sites
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || "Erreur lors de la création du compte");
      }

      // Mettre à jour la demande avec statut "en_attente_validation_mail"
      // (le compte est créé mais l'email n'a pas encore été validé/envoyé)
      await supabase
        .from("tbl_user_requests")
        .update({
          statut: "en_attente_validation_mail",
          traite_par: (await supabase.auth.getUser()).data.user?.id || null,
          date_traitement: new Date().toISOString(),
          role_attribue_id: selectedRoleId,
          site_id: selectedSiteIds[0] || null, // Prendre le premier site pour compatibilité
        })
        .eq("id", showAcceptModal.id);

      // Fermer le modal et afficher un message de succès
      setShowAcceptModal(null);
      setSelectedRoleId("");
      setSelectedSiteIds([]);
      setError(null);
      setSuccess("Compte créé avec succès ! La demande est maintenant en attente de validation email. L'utilisateur apparaît dans la liste des utilisateurs.");
      
      // Rester sur l'onglet Demandes pour voir la demande mise à jour avec le nouveau statut
      // L'utilisateur peut basculer manuellement vers "Utilisateurs" s'il le souhaite
      
      // Forcer le rafraîchissement de la page pour afficher les nouvelles données
      router.refresh();
      
      // Effacer le message de succès après 5 secondes
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'acceptation de la demande";
      setError(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const motif = prompt("Motif du refus :");
    if (!motif) return;

    setLoading(requestId);
    setError(null);

    try {
      const supabase = createClientSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase
        .from("tbl_user_requests")
        .update({
          statut: "refusee",
          motif_refus: motif,
          traite_par: user?.id || null,
          date_traitement: new Date().toISOString(),
        })
        .eq("id", requestId);

      // Envoyer email de refus (sera fait via une API route)

      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du refus de la demande";
      setError(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (statut: string) => {
    const styles = {
      actif: "bg-green-100 text-green-800",
      inactif: "bg-gray-100 text-gray-800",
      suspendu: "bg-red-100 text-red-800",
      en_attente: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          styles[statut as keyof typeof styles] || styles.inactif
        }`}
      >
        {statut}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Gestion des utilisateurs
          </h1>
          <p className="text-lg text-secondary">
            Gérez les utilisateurs et les demandes d&apos;accès
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Onglets */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("requests")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "requests"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Demandes en attente
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-accent text-white rounded-full px-2 py-0.5 text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Utilisateurs ({users.length})
            </button>
          </nav>
        </div>

        {/* Demandes en attente */}
        {activeTab === "requests" && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Demandes d&apos;accès en attente
            </h2>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <p className="text-gray-500">Aucune demande en attente</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                        Nom / Prénom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                        Date demande
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests && pendingRequests.length > 0 ? (
                      pendingRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-primary/5 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.nom} {request.prenom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.created_at
                              ? new Date(request.created_at).toLocaleDateString("fr-FR")
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {request.statut === "en_attente_validation_mail" ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-300 bg-blue-100 text-blue-800">
                                ⏳ Attente validation email
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border border-yellow-300 bg-yellow-100 text-yellow-800">
                                📝 En attente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {request.statut === "en_attente_validation_mail" ? (
                              <span className="text-gray-500 text-sm">
                                Compte créé - Email en attente
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAcceptRequest(request)}
                                  className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50"
                                  disabled={loading === request.id}
                                >
                                  ✅ Accepter
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request.id)}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                  disabled={loading === request.id}
                                >
                                  ❌ Refuser
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          Aucune demande en attente
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Utilisateurs */}
        {activeTab === "users" && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Liste des utilisateurs
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                      Dernière connexion
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-primary/5 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const userRoles = user.user_roles || [];
                            if (userRoles.length === 0) return "Non attribué";
                            const firstRole = userRoles[0];
                            const role = Array.isArray(firstRole?.roles) 
                              ? firstRole.roles[0] 
                              : firstRole?.roles;
                            return role?.name || "Non attribué";
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.statut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.derniere_connexion
                            ? new Date(user.derniere_connexion).toLocaleDateString("fr-FR")
                            : "Jamais"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <a
                            href={`/profile`}
                            className="text-primary hover:text-primary-dark"
                          >
                            Voir
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Aucun utilisateur enregistré
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal d'acceptation */}
        {showAcceptModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border border-gray-200 w-96 shadow-xl rounded-lg bg-white max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-secondary mb-4">
                Attribuer un rôle à {showAcceptModal.nom} {showAcceptModal.prenom}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Rôle *
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900 text-sm"
                    style={{
                      color: '#111827',
                    }}
                  >
                    <option value="" style={{ color: '#6B7280' }}>Sélectionner un rôle</option>
                    {roles.map((role) => (
                      <option 
                        key={role.id} 
                        value={role.id}
                        style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Sites (optionnel - choix multiple)
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                    {sites.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun site disponible</p>
                    ) : (
                      <div className="space-y-2">
                        {sites.map((site) => (
                          <label
                            key={site.site_id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSiteIds.includes(site.site_id)}
                              onChange={() => handleToggleSite(site.site_id)}
                              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
                              style={{
                                color: '#4F46E5',
                                backgroundColor: selectedSiteIds.includes(site.site_id) ? '#4F46E5' : '#ffffff',
                              }}
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">
                                {site.site_code} - {site.site_label}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedSiteIds.length > 0 && (
                    <p className="mt-2 text-xs text-gray-600">
                      {selectedSiteIds.length} site{selectedSiteIds.length > 1 ? 's' : ''} sélectionné{selectedSiteIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={confirmAcceptRequest}
                    disabled={!selectedRoleId || loading === showAcceptModal.id}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {loading === showAcceptModal.id ? "Création..." : "Créer le compte"}
                  </button>
                  <button
                    onClick={() => setShowAcceptModal(null)}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

