"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Filter, CheckCircle, AlertTriangle } from "lucide-react";
import Modal from "@/components/rh/Modal";
import type { Formation } from "@/types/rh";

interface PlanFormationClientProps {
  initialFormations: Formation[];
  collaborateurs: Array<{ id: string; nom: string; prenom: string; email: string }>;
  catalogue: Array<{ id: string; nom: string; code_interne?: string | null }>;
  currentYear: number;
}

export default function PlanFormationClient({
  initialFormations,
  collaborateurs,
  catalogue,
  currentYear,
}: PlanFormationClientProps) {
  const router = useRouter();
  const [formations] = useState(initialFormations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Formation | null>(null);
  const [filters, setFilters] = useState({
    statut: "",
    collaborateur: "",
    annee: currentYear.toString(),
  });

  const [formData, setFormData] = useState({
    collaborateur_id: "",
    catalogue_formation_id: "",
    libelle: "",
    type_formation: "externe" as "interne" | "externe" | "habilitation" | "certification" | "autre",
    date_debut: "",
    date_fin: "",
    duree_heures: "",
    organisme_formateur: "",
    formateur: "",
    statut: "planifiee" as "planifiee" | "en_cours" | "terminee" | "abandonnee" | "echec" | "reportee" | "annulee",
    resultat: "",
    cout_reel: "",
    priorite: "moyenne" as "haute" | "moyenne" | "basse",
    impact_planif: true,
    commentaire: "",
  });

  const filteredFormations = useMemo(() => {
    return formations.filter((f) => {
      if (filters.statut && f.statut !== filters.statut) return false;
      if (filters.collaborateur && f.collaborateur_id !== filters.collaborateur) return false;
      if (filters.annee) {
        const year = new Date(f.date_debut).getFullYear();
        if (year !== parseInt(filters.annee)) return false;
      }
      return true;
    });
  }, [formations, filters]);

  const stats = useMemo(() => {
    return {
      total: filteredFormations.length,
      planifiee: filteredFormations.filter((f) => f.statut === "planifiee").length,
      en_cours: filteredFormations.filter((f) => f.statut === "en_cours").length,
      terminee: filteredFormations.filter((f) => f.statut === "terminee").length,
      budget_consomme: filteredFormations
        .filter((f) => f.statut === "terminee" && f.cout_reel)
        .reduce((sum, f) => sum + (f.cout_reel || 0), 0),
    };
  }, [filteredFormations]);

  const resetForm = () => {
    setFormData({
      collaborateur_id: "",
      catalogue_formation_id: "",
      libelle: "",
      type_formation: "externe",
      date_debut: "",
      date_fin: "",
      duree_heures: "",
      organisme_formateur: "",
      formateur: "",
      statut: "planifiee",
      resultat: "",
      cout_reel: "",
      priorite: "moyenne",
      impact_planif: true,
      commentaire: "",
    });
    setSelectedItem(null);
    setError(null);
    setSuccess(null);
  };

  const handleOpenModal = (item?: Formation) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        collaborateur_id: item.collaborateur_id,
        catalogue_formation_id: item.catalogue_formation_id || "",
        libelle: item.libelle,
        type_formation: item.type_formation || "externe",
        date_debut: item.date_debut.split('T')[0],
        date_fin: item.date_fin?.split('T')[0] || "",
        duree_heures: item.duree_heures?.toString() || "",
        organisme_formateur: item.organisme_formateur || "",
        formateur: item.formateur || "",
        statut: item.statut,
        resultat: item.resultat || "",
        cout_reel: item.cout_reel?.toString() || "",
        priorite: item.priorite || "moyenne",
        impact_planif: item.impact_planif,
        commentaire: item.commentaire || "",
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        collaborateur_id: formData.collaborateur_id,
        libelle: formData.libelle.trim(),
        type_formation: formData.type_formation,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || null,
        duree_heures: formData.duree_heures ? parseFloat(formData.duree_heures) : null,
        organisme_formateur: formData.organisme_formateur.trim() || null,
        formateur: formData.formateur.trim() || null,
        statut: formData.statut,
        resultat: formData.resultat.trim() || null,
        cout_reel: formData.cout_reel ? parseFloat(formData.cout_reel) : null,
        priorite: formData.priorite,
        impact_planif: formData.impact_planif,
        commentaire: formData.commentaire.trim() || null,
      };

      if (formData.catalogue_formation_id) {
        payload.catalogue_formation_id = formData.catalogue_formation_id;
      }

      const url = selectedItem
        ? `/api/rh/formations/${selectedItem.id}`
        : "/api/rh/formations";

      const method = selectedItem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      setSuccess(selectedItem ? "Formation mise à jour" : "Formation créée avec succès");
      router.refresh();

      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
              Plan de Formation
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Suivi et exécution des formations validées
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nouvelle formation
          </button>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm sm:text-base text-green-800 font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm sm:text-base text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card border-l-4 border-l-primary bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="card border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Planifiées</div>
            <div className="text-2xl font-bold text-blue-600">{stats.planifiee}</div>
          </div>
          <div className="card border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">En cours</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.en_cours}</div>
          </div>
          <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Terminées</div>
            <div className="text-2xl font-bold text-green-600">{stats.terminee}</div>
          </div>
          <div className="card border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Budget consommé</div>
            <div className="text-2xl font-bold text-purple-600">{stats.budget_consomme.toFixed(0)} €</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">Filtres</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="planifiee">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
                <option value="annulee">Annulée</option>
                <option value="reportee">Reportée</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Collaborateur</label>
              <select
                value={filters.collaborateur}
                onChange={(e) => setFilters({ ...filters, collaborateur: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                {collaborateurs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
              <select
                value={filters.annee}
                onChange={(e) => setFilters({ ...filters, annee: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Collaborateur
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Formation
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden md:table-cell">
                    Dates
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Organisme
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden xl:table-cell">
                    Coût
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFormations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Aucune formation
                    </td>
                  </tr>
                ) : (
                  filteredFormations.map((formation) => (
                    <tr key={formation.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formation.collaborateur?.prenom} {formation.collaborateur?.nom}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm text-gray-900">{formation.libelle}</div>
                        {formation.catalogue_formation && (
                          <div className="text-xs text-gray-500">
                            {formation.catalogue_formation.code_interne}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        <div>{new Date(formation.date_debut).toLocaleDateString('fr-FR')}</div>
                        {formation.date_fin && (
                          <div className="text-xs">
                            au {new Date(formation.date_fin).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                        {formation.organisme_formateur || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          formation.statut === 'terminee' ? 'bg-green-100 text-green-800' :
                          formation.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                          formation.statut === 'planifiee' ? 'bg-yellow-100 text-yellow-800' :
                          formation.statut === 'annulee' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {formation.statut}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {formation.cout_reel ? `${formation.cout_reel.toFixed(0)} €` : "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(formation)}
                          className="text-primary hover:text-primary-dark"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal création/édition */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedItem ? "Modifier la formation" : "Nouvelle formation"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collaborateur *
              </label>
              <select
                required
                value={formData.collaborateur_id}
                onChange={(e) => setFormData({ ...formData, collaborateur_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Sélectionner...</option>
                {collaborateurs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formation *
              </label>
              <select
                value={formData.catalogue_formation_id}
                onChange={(e) => {
                  const selected = catalogue.find(c => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    catalogue_formation_id: e.target.value,
                    libelle: selected?.nom || formData.libelle,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Sélectionner depuis le catalogue...</option>
                {catalogue.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code_interne ? `${f.code_interne} - ` : ""}{f.nom}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="ou saisir le nom de la formation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary mt-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de formation
              </label>
              <select
                value={formData.type_formation}
                onChange={(e) => setFormData({ ...formData, type_formation: e.target.value as "interne" | "externe" | "habilitation" | "certification" | "autre" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="interne">Interne</option>
                <option value="externe">Externe</option>
                <option value="habilitation">Habilitation</option>
                <option value="certification">Certification</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value as "planifiee" | "en_cours" | "terminee" | "abandonnee" | "echec" | "reportee" | "annulee" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="planifiee">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
                <option value="annulee">Annulée</option>
                <option value="reportee">Reportée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début *
              </label>
              <input
                type="date"
                required
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (heures)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.duree_heures}
                onChange={(e) => setFormData({ ...formData, duree_heures: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organisme formateur
              </label>
              <input
                type="text"
                value={formData.organisme_formateur}
                onChange={(e) => setFormData({ ...formData, organisme_formateur: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coût réel (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cout_reel}
                onChange={(e) => setFormData({ ...formData, cout_reel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priorité
              </label>
              <select
                value={formData.priorite}
                onChange={(e) => setFormData({ ...formData, priorite: e.target.value as "haute" | "moyenne" | "basse" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>

            {formData.statut === 'terminee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Résultat
                </label>
                <select
                  value={formData.resultat}
                  onChange={(e) => setFormData({ ...formData, resultat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Sélectionner...</option>
                  <option value="reussi">Réussi</option>
                  <option value="echec">Échec</option>
                  <option value="en_attente">En attente</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire
              </label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.impact_planif}
                  onChange={(e) => setFormData({ ...formData, impact_planif: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Impacte la planification (bloque la disponibilité)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sauvegarde..." : selectedItem ? "Modifier" : "Créer"}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

