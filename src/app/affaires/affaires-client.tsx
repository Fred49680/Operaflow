"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Trash2, X, AlertTriangle } from "lucide-react";
import type { Affaire } from "@/types/affaires";
import AffaireDetailModal from "@/components/affaires/AffaireDetailModal";

interface AffairesClientProps {
  initialAffaires: Affaire[];
  sites?: Array<{ site_id: string; site_code: string; site_label: string }>;
  collaborateurs?: Array<{ id: string; nom: string; prenom: string }>;
  isAdmin?: boolean;
}

export default function AffairesClient({
  initialAffaires,
  sites: _sites,
  collaborateurs: _collaborateurs,
  isAdmin = false,
}: AffairesClientProps) {
  const router = useRouter();
  const [affaires, setAffaires] = useState(initialAffaires);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    statut: "",
    site: "",
    type_valorisation: "",
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [affaireToDelete, setAffaireToDelete] = useState<Affaire | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedAffaireId, setSelectedAffaireId] = useState<string | null>(null);
  const [showAffaireModal, setShowAffaireModal] = useState(false);

  const handleOpenAffaire = (affaireId: string) => {
    setSelectedAffaireId(affaireId);
    setShowAffaireModal(true);
  };

  const handleCloseAffaireModal = () => {
    setShowAffaireModal(false);
    setSelectedAffaireId(null);
    router.refresh(); // Rafraîchir la liste après fermeture
  };

  // Filtrage et recherche
  const filteredAffaires = useMemo(() => {
    return affaires.filter((affaire) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !affaire.numero.toLowerCase().includes(searchLower) &&
          !affaire.libelle.toLowerCase().includes(searchLower) &&
          !affaire.partenaire?.raison_sociale?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.statut && affaire.statut !== filters.statut) return false;
      if (filters.site && affaire.site_id !== filters.site) return false;
      if (filters.type_valorisation && affaire.type_valorisation !== filters.type_valorisation) return false;
      return true;
    });
  }, [affaires, searchTerm, filters]);

  // Statistiques
  const stats = useMemo(() => {
    const filtered = filteredAffaires;
    return {
      total: filtered.length,
      en_cours: filtered.filter((a) => a.statut === "en_cours").length,
      planifie: filtered.filter((a) => a.statut === "planifie").length,
      termine: filtered.filter((a) => a.statut === "termine").length,
      montant_total: filtered.reduce((sum, a) => sum + (a.montant_total || 0), 0),
    };
  }, [filteredAffaires]);

  // Handler pour supprimer une affaire
  const handleDeleteAffaire = async () => {
    if (!affaireToDelete || confirmText !== "Confirmer") {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/affaires/${affaireToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Retirer l'affaire de la liste
        setAffaires((prev) => prev.filter((a) => a.id !== affaireToDelete.id));
        setShowDeleteModal(false);
        setAffaireToDelete(null);
        setConfirmText("");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Erreur lors de la suppression: ${error.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      console.error("Erreur suppression affaire:", error);
      alert("Erreur lors de la suppression de l'affaire");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      cree: "bg-gray-100 text-gray-800 border border-gray-300",
      en_attente_planification: "bg-amber-100 text-amber-800 border border-amber-300",
      pre_planifie: "bg-blue-100 text-blue-800 border border-blue-300",
      planifie: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      en_cours: "bg-green-100 text-green-800 border border-green-300",
      suspendu: "bg-orange-100 text-orange-800 border border-orange-300",
      en_cloture: "bg-purple-100 text-purple-800 border border-purple-300",
      termine: "bg-emerald-100 text-emerald-800 border border-emerald-300",
      archive: "bg-gray-200 text-gray-600 border border-gray-400",
    };

    const labels: Record<string, string> = {
      cree: "Créée",
      en_attente_planification: "En attente de planification",
      pre_planifie: "Pré-planifiée",
      planifie: "Planifiée",
      en_cours: "En cours",
      suspendu: "Suspendue",
      en_cloture: "En clôture",
      termine: "Terminée",
      archive: "Archivée",
    };

    return (
      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${styles[statut] || styles.cree}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
              Gestion des Affaires
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Suivi et valorisation des affaires et projets
            </p>
          </div>
          <Link
            href="/affaires/new"
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nouvelle affaire
          </Link>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card border-l-4 border-l-primary bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">En cours</div>
            <div className="text-2xl font-bold text-green-600">{stats.en_cours}</div>
          </div>
          <div className="card border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Planifiées</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.planifie}</div>
          </div>
          <div className="card border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Terminées</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.termine}</div>
          </div>
          <div className="card border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Montant total</div>
            <div className="text-2xl font-bold text-blue-600">{stats.montant_total.toFixed(0)} €</div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-gray-400" />
                <label className="block text-xs font-medium text-gray-700">Recherche</label>
              </div>
              <input
                type="text"
                placeholder="Rechercher par numéro, libellé, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="cree">Créée</option>
                <option value="en_attente_planification">En attente de planification</option>
                <option value="pre_planifie">Pré-planifiée</option>
                <option value="planifie">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="suspendu">Suspendue</option>
                <option value="en_cloture">En clôture</option>
                <option value="termine">Terminée</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Type valorisation</label>
              <select
                value={filters.type_valorisation}
                onChange={(e) => setFilters({ ...filters, type_valorisation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="BPU">BPU</option>
                <option value="forfait">Forfait</option>
                <option value="dépense">Dépense</option>
                <option value="mixte">Mixte</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des affaires */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Libellé
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden md:table-cell">
                    Client
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Site
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden xl:table-cell">
                    Montant
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  {isAdmin && (
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAffaires.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                      Aucune affaire trouvée
                    </td>
                  </tr>
                ) : (
                  filteredAffaires.map((affaire) => (
                    <tr
                      key={affaire.id}
                      className="hover:bg-primary/5 transition-colors duration-150"
                    >
                      <td 
                        className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                        onClick={() => handleOpenAffaire(affaire.id)}
                      >
                        {affaire.numero}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-4 cursor-pointer"
                        onClick={() => handleOpenAffaire(affaire.id)}
                      >
                        <div className="text-sm font-medium text-gray-900">{affaire.libelle}</div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {affaire.partenaire?.raison_sociale && `${affaire.partenaire.raison_sociale} • `}
                          {affaire.montant_total ? `${affaire.montant_total.toFixed(0)} €` : ""}
                        </div>
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell cursor-pointer"
                        onClick={() => handleOpenAffaire(affaire.id)}
                      >
                        {affaire.partenaire?.raison_sociale || "-"}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell cursor-pointer"
                        onClick={() => handleOpenAffaire(affaire.id)}
                      >
                        {affaire.site?.site_code || "-"}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell cursor-pointer"
                        onClick={() => handleOpenAffaire(affaire.id)}
                      >
                        {affaire.montant_total ? `${affaire.montant_total.toFixed(2)} €` : "-"}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => handleOpenAffaire(affaire.id)}
                      >
                        {getStatutBadge(affaire.statut)}
                      </td>
                      {isAdmin && (
                        <td 
                          className="px-3 sm:px-6 py-4 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setAffaireToDelete(affaire);
                              setShowDeleteModal(true);
                              setConfirmText("");
                            }}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer l'affaire"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
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

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && affaireToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer l'affaire</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAffaireToDelete(null);
                  setConfirmText("");
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-4">
                Êtes-vous sûr de vouloir supprimer l'affaire <span className="font-semibold">{affaireToDelete.numero} - {affaireToDelete.libelle}</span> ?
              </p>
              <p className="text-xs text-red-600 mb-4">
                ⚠️ Cette action supprimera également :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Toutes les activités de planification</li>
                  <li>Le suivi quotidien associé</li>
                  <li>Les lots et jalons</li>
                  <li>Les lignes BPU et dépenses</li>
                  <li>Les documents liés</li>
                </ul>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tapez <span className="font-semibold text-red-600">"Confirmer"</span> pour valider la suppression :
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Confirmer"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAffaireToDelete(null);
                  setConfirmText("");
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAffaire}
                disabled={confirmText !== "Confirmer" || isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail affaire */}
      {selectedAffaireId && (
        <AffaireDetailModal
          isOpen={showAffaireModal}
          onClose={handleCloseAffaireModal}
          affaireId={selectedAffaireId}
          onUpdate={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

