"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, AlertTriangle, Calendar, Users, X, CalendarIcon } from "lucide-react";
import type { Collaborateur, AlerteEcheance } from "@/types/rh";
import Modal from "@/components/rh/Modal";
import CollaborateurDetailModal from "@/components/rh/CollaborateurDetailModal";

interface RHPageClientProps {
  collaborateurs: Collaborateur[];
  alertes: AlerteEcheance[];
  hasRHAccess: boolean;
}

export default function RHPageClient({
  collaborateurs,
  alertes,
  hasRHAccess,
}: RHPageClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalInactifOpen, setModalInactifOpen] = useState(false);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState<Collaborateur | null>(null);
  const [dateFinContrat, setDateFinContrat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalDetailOpen, setModalDetailOpen] = useState(false);
  const [selectedCollaborateurId, setSelectedCollaborateurId] = useState<string | null>(null);

  const filteredCollaborateurs = collaborateurs.filter((collab) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      collab.nom.toLowerCase().includes(searchLower) ||
      collab.prenom.toLowerCase().includes(searchLower) ||
      collab.email.toLowerCase().includes(searchLower) ||
      collab.fonction_metier?.toLowerCase().includes(searchLower) ||
      collab.site?.toLowerCase().includes(searchLower)
    );
  });

  const alertesUrgentes = alertes.filter(
    (a) => a.statut_alerte === "expiree" || (a.jours_restants !== null && a.jours_restants <= 7)
  );

  const handleStatutClick = (e: React.MouseEvent, collab: Collaborateur) => {
    e.stopPropagation(); // Empêcher le clic sur la ligne
    if (hasRHAccess && collab.statut === "actif") {
      setSelectedCollaborateur(collab);
      setDateFinContrat("");
      setModalInactifOpen(true);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDesactiver = async () => {
    if (!selectedCollaborateur || !dateFinContrat) {
      setError("Veuillez renseigner une date de fin de contrat");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rh/collaborateurs/${selectedCollaborateur.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statut: "inactif",
          date_fin_contrat: dateFinContrat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la désactivation");
      }

      setSuccess("Collaborateur désactivé avec succès");
      setTimeout(() => {
        setModalInactifOpen(false);
        setSelectedCollaborateur(null);
        setDateFinContrat("");
        setSuccess(null);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la désactivation");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (collabId: string) => {
    setSelectedCollaborateurId(collabId);
    setModalDetailOpen(true);
  };

  const handleCloseDetailModal = () => {
    setModalDetailOpen(false);
    setSelectedCollaborateurId(null);
    // Rafraîchir la liste après fermeture
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
                RH Collaborateurs
              </h1>
              <p className="text-base sm:text-lg text-secondary">
                Gestion des collaborateurs, absences, formations et conformité
              </p>
            </div>
            {hasRHAccess && (
              <Link href="/rh/new" className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
                <Plus className="h-5 w-5" />
                <span className="whitespace-nowrap">Nouveau collaborateur</span>
              </Link>
            )}
          </div>
        </div>

        {/* Alertes */}
        {hasRHAccess && alertesUrgentes.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">
                Alertes d'échéances ({alertesUrgentes.length})
              </h3>
            </div>
            <div className="space-y-1">
              {alertesUrgentes.slice(0, 5).map((alerte) => (
                <div key={alerte.id} className="text-sm text-yellow-800">
                  <Link
                    href={`/rh/${alerte.collaborateur_id}`}
                    className="hover:underline"
                  >
                    {alerte.prenom} {alerte.nom}
                  </Link>
                  {" - "}
                  {alerte.libelle_document}
                    {alerte.jours_restants !== null && alerte.jours_restants >= 0 && (
                    <span className="ml-2 font-semibold">
                      ({alerte.jours_restants} jour{alerte.jours_restants !== 1 ? "s" : ""} restant{alerte.jours_restants !== 1 ? "s" : ""})
                    </span>
                  )}
                  {alerte.jours_restants !== null && alerte.jours_restants < 0 && (
                    <span className="ml-2 font-semibold text-red-600">
                      (Expiré il y a {Math.abs(alerte.jours_restants)} jour{Math.abs(alerte.jours_restants) !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              ))}
              {alertesUrgentes.length > 5 && (
                <Link
                  href="/rh/alertes"
                  className="text-sm text-yellow-700 hover:underline font-medium"
                >
                  Voir toutes les alertes ({alertesUrgentes.length})
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Statistiques */}
        {hasRHAccess && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card border-l-4 border-l-primary bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total collaborateurs</p>
                  <p className="text-2xl font-bold text-primary">
                    {collaborateurs.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Actifs</p>
                  <p className="text-2xl font-bold text-green-600">
                    {collaborateurs.filter((c) => c.statut === "actif").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Échéances proches</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {alertes.filter((a) => a.statut_alerte === "echeance_proche").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Expirées</p>
                  <p className="text-2xl font-bold text-red-600">
                    {alertes.filter((a) => a.statut_alerte === "expiree").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des collaborateurs */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Collaborateur
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden sm:table-cell">
                    Fonction
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden md:table-cell">
                    Site
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Contrat
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  {hasRHAccess && (
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                      Responsable
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCollaborateurs.length === 0 ? (
                  <tr>
                    <td colSpan={hasRHAccess ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? "Aucun résultat trouvé" : "Aucun collaborateur"}
                    </td>
                  </tr>
                ) : (
                  filteredCollaborateurs.map((collab) => (
                    <tr 
                      key={collab.id} 
                      className="hover:bg-primary/5 cursor-pointer transition-colors duration-150"
                      onClick={() => handleRowClick(collab.id)}
                    >
                      <td className="px-3 sm:px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {collab.prenom} {collab.nom}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">{collab.email}</div>
                          <div className="text-xs text-gray-500 sm:hidden mt-1">
                            {collab.fonction_metier && `${collab.fonction_metier} • `}
                            {collab.site_detail 
                              ? collab.site_detail.site_label
                              : collab.site || ""}
                            {collab.type_contrat && ` • ${collab.type_contrat}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                        {collab.fonction_metier || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {collab.site_detail 
                          ? collab.site_detail.site_label
                          : collab.site || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {collab.type_contrat || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          onClick={(e) => handleStatutClick(e, collab)}
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${
                            collab.statut === "actif" && hasRHAccess
                              ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 cursor-pointer"
                              : collab.statut === "actif"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : collab.statut === "A renouveller"
                              ? "bg-orange-100 text-orange-800 border-orange-300"
                              : collab.statut === "inactif"
                              ? "bg-gray-100 text-gray-800 border-gray-300"
                              : collab.statut === "suspendu"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          {collab.statut}
                        </span>
                      </td>
                      {hasRHAccess && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                          {collab.responsable_activite
                            ? `${collab.responsable_activite.prenom} ${collab.responsable_activite.nom}`
                            : collab.responsable
                            ? `${collab.responsable.prenom} ${collab.responsable.nom}`
                            : "-"}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Désactivation */}
      <Modal
        isOpen={modalInactifOpen}
        onClose={() => {
          setModalInactifOpen(false);
          setSelectedCollaborateur(null);
          setDateFinContrat("");
          setError(null);
          setSuccess(null);
        }}
        title="Désactiver le collaborateur"
      >
        <div className="space-y-4">
          {selectedCollaborateur && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Collaborateur</p>
              <p className="font-medium text-gray-900">
                {selectedCollaborateur.prenom} {selectedCollaborateur.nom}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded-r-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin de contrat <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFinContrat}
                onChange={(e) => setDateFinContrat(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                min={new Date().toISOString().split("T")[0]}
              />
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Le collaborateur passera en statut "inactif" à cette date
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setModalInactifOpen(false);
                setSelectedCollaborateur(null);
                setDateFinContrat("");
                setError(null);
                setSuccess(null);
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDesactiver}
              disabled={loading || !dateFinContrat}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Désactivation...
                </>
              ) : (
                <>
                  <X className="h-5 w-5" />
                  Désactiver
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Détail Collaborateur */}
      {selectedCollaborateurId && (
        <CollaborateurDetailModal
          isOpen={modalDetailOpen}
          onClose={handleCloseDetailModal}
          collaborateurId={selectedCollaborateurId}
          onUpdate={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

