"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Search, Plus, AlertTriangle, Users, X } from "lucide-react";
import GanttTimeline from "@/components/planification/gantt/GanttTimeline";
import type { ActivitePlanification, AffectationPlanification } from "@/types/planification";

interface PlanificationClientProps {
  activites: ActivitePlanification[];
  affectations: AffectationPlanification[];
  sites?: Array<{ site_id: string; site_code: string; site_label: string }>;
  affaires?: Array<{ id: string; numero: string; libelle: string; statut: string }>;
  collaborateurs?: Array<{ id: string; nom: string; prenom: string }>;
}

export default function PlanificationClient({
  activites,
  affectations: _affectations,
  sites = [],
  affaires = [],
  collaborateurs: _collaborateurs = [],
}: PlanificationClientProps) {
  // Suppression des avertissements pour variables préfixées avec _
  void _affectations;
  void _collaborateurs;
  const router = useRouter();
  const [activeView, setActiveView] = useState<"gantt" | "suivi" | "alertes">("gantt");
  const [filters, setFilters] = useState({
    site: "",
    affaire: "",
    responsable: "",
    statut: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiviteModal, setShowActiviteModal] = useState(false);
  const [editingActivite, setEditingActivite] = useState<ActivitePlanification | null>(null);
  const [saving, setSaving] = useState(false);

  // Filtrage des activités
  const filteredActivites = useMemo(() => {
    return activites.filter((activite) => {
      if (filters.site && activite.site_id !== filters.site) return false;
      if (filters.affaire && activite.affaire_id !== filters.affaire) return false;
      if (filters.responsable && activite.responsable_id !== filters.responsable) return false;
      if (filters.statut && activite.statut !== filters.statut) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !activite.libelle.toLowerCase().includes(searchLower) &&
          !activite.numero_activite?.toLowerCase().includes(searchLower) &&
          !activite.affaire?.numero.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activites, filters, searchTerm]);

  // Fonction pour ouvrir le modal de création
  const handleCreateActivite = () => {
    setEditingActivite(null);
    setShowActiviteModal(true);
  };

  // Fonction pour mettre à jour une activité
  const handleUpdateActivite = async (activiteId: string, updates: Partial<ActivitePlanification>) => {
    try {
      const response = await fetch(`/api/planification/activites/${activiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  // Fonction pour supprimer une activité
  const handleDeleteActivite = async (activiteId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette activité ?")) return;

    try {
      const response = await fetch(`/api/planification/activites/${activiteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
                Planification & Suivi
              </h1>
              <p className="text-base sm:text-lg text-secondary">
                Gantt multi-affaires, suivi quotidien et valorisation horaire
              </p>
            </div>
            <button
              onClick={handleCreateActivite}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              Nouvelle activité
            </button>
          </div>

          {/* Onglets */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveView("gantt")}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeView === "gantt"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Gantt
              </button>
              <button
                onClick={() => setActiveView("suivi")}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeView === "suivi"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users className="h-4 w-4" />
                Suivi quotidien
              </button>
              <button
                onClick={() => setActiveView("alertes")}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeView === "alertes"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Alertes
              </button>
            </nav>
          </div>

          {/* Filtres */}
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-5 w-5 text-gray-400" />
                  <label className="block text-xs font-medium text-gray-700">Recherche</label>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par activité, numéro, affaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Site</label>
                <select
                  value={filters.site}
                  onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Tous</option>
                  {sites.map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.site_code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Affaire</label>
                <select
                  value={filters.affaire}
                  onChange={(e) => setFilters({ ...filters, affaire: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Toutes</option>
                  {affaires.map((affaire) => (
                    <option key={affaire.id} value={affaire.id}>
                      {affaire.numero} - {affaire.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.statut}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Tous</option>
                  <option value="planifiee">Planifiée</option>
                  <option value="lancee">Lancée</option>
                  <option value="suspendue">Suspendue</option>
                  <option value="terminee">Terminée</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu selon vue active */}
        {activeView === "gantt" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary">
                Planning Gantt ({filteredActivites.length} activité{filteredActivites.length > 1 ? "s" : ""})
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={filters.statut || ""}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Tous les statuts</option>
                  <option value="planifiee">Planifiée</option>
                  <option value="lancee">Lancée</option>
                  <option value="terminee">Terminée</option>
                </select>
              </div>
            </div>

            {filteredActivites.length > 0 ? (
              <GanttTimeline
                activites={filteredActivites}
                vue="semaine"
                onActiviteClick={(activite) => {
                  // Ouvrir modal de détails ou édition
                  setEditingActivite(activite);
                  setShowActiviteModal(true);
                }}
              />
            ) : (
              <div className="card text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucune activité trouvée avec les filtres sélectionnés</p>
              </div>
            )}
          </div>
        )}

        {activeView === "suivi" && (
          <div className="card">
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary mb-2">
                Suivi quotidien
              </h2>
              <p className="text-gray-600 mb-6">
                Interface de saisie terrain à implémenter
              </p>
            </div>
          </div>
        )}

        {activeView === "alertes" && (
          <div className="card">
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary mb-2">
                Alertes planification
              </h2>
              <p className="text-gray-600 mb-6">
                Liste des alertes automatiques à implémenter
              </p>
            </div>
          </div>
        )}

        {/* Modal Création/Édition Activité */}
        {showActiviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-primary">
                  {editingActivite ? "Modifier l'activité" : "Nouvelle activité"}
                </h2>
                <button
                  onClick={() => {
                    setShowActiviteModal(false);
                    setEditingActivite(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);

                  const formData = new FormData(e.currentTarget);
                  const payload = {
                    affaire_id: formData.get("affaire_id") as string,
                    lot_id: formData.get("lot_id") || null,
                    site_id: formData.get("site_id") || null,
                    libelle: formData.get("libelle") as string,
                    description: formData.get("description") || null,
                    date_debut_prevue: formData.get("date_debut_prevue") as string,
                    date_fin_prevue: formData.get("date_fin_prevue") as string,
                    responsable_id: formData.get("responsable_id") || null,
                    heures_prevues: parseFloat(formData.get("heures_prevues") as string) || 0,
                    type_horaire: formData.get("type_horaire") as string || "jour",
                    coefficient: parseFloat(formData.get("coefficient") as string) || 1.0,
                  };

                  try {
                    const url = editingActivite
                      ? `/api/planification/activites/${editingActivite.id}`
                      : "/api/planification/activites";
                    const method = editingActivite ? "PATCH" : "POST";

                    const response = await fetch(url, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });

                    if (response.ok) {
                      setShowActiviteModal(false);
                      setEditingActivite(null);
                      router.refresh();
                    } else {
                      const error = await response.json();
                      alert(`Erreur: ${error.error || "Erreur inconnue"}`);
                    }
                  } catch (error) {
                    console.error("Erreur:", error);
                    alert("Une erreur est survenue");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Affaire <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="affaire_id"
                      required
                      defaultValue={editingActivite?.affaire_id || filters.affaire}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Sélectionner une affaire</option>
                      {affaires.map((affaire) => (
                        <option key={affaire.id} value={affaire.id}>
                          {affaire.numero} - {affaire.libelle}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Libellé <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="libelle"
                      required
                      defaultValue={editingActivite?.libelle || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                    <select
                      name="site_id"
                      defaultValue={editingActivite?.site_id || filters.site}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Aucun</option>
                      {sites.map((site) => (
                        <option key={site.site_id} value={site.site_id}>
                          {site.site_code} - {site.site_label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="date_debut_prevue"
                      required
                      defaultValue={editingActivite?.date_debut_prevue ? new Date(editingActivite.date_debut_prevue).toISOString().slice(0, 16) : ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="date_fin_prevue"
                      required
                      defaultValue={editingActivite?.date_fin_prevue ? new Date(editingActivite.date_fin_prevue).toISOString().slice(0, 16) : ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heures prévues</label>
                    <input
                      type="number"
                      name="heures_prevues"
                      step="0.5"
                      min="0"
                      defaultValue={editingActivite?.heures_prevues || 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type horaire</label>
                    <select
                      name="type_horaire"
                      defaultValue={editingActivite?.type_horaire || "jour"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="jour">Jour</option>
                      <option value="nuit">Nuit</option>
                      <option value="weekend">Week-end</option>
                      <option value="ferie">Férié</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={editingActivite?.description || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActiviteModal(false);
                      setEditingActivite(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                    disabled={saving}
                  >
                    {saving ? "Enregistrement..." : editingActivite ? "Modifier" : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

