"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Search, Plus, AlertTriangle, Users, X } from "lucide-react";
import GanttTimeline from "@/components/planification/gantt/GanttTimeline";
import AffairesEnAttente from "@/components/planification/AffairesEnAttente";
import AffairesPlanifiees from "@/components/planification/AffairesPlanifiees";
import TemplateSelectorModal from "@/components/planification/TemplateSelectorModal";
import type { ActivitePlanification, AffectationPlanification } from "@/types/planification";

interface PlanificationClientProps {
  activites: ActivitePlanification[];
  affectations: AffectationPlanification[];
  sites?: Array<{ site_id: string; site_code: string; site_label: string }>;
  affaires?: Array<{ id: string; numero: string; libelle: string; statut: string }>;
  collaborateurs?: Array<{ id: string; nom: string; prenom: string }>;
  isPlanificateur?: boolean;
  userId?: string;
}

export default function PlanificationClient({
  activites,
  affectations: _affectations,
  sites = [],
  affaires = [],
  collaborateurs: _collaborateurs = [],
  isPlanificateur = false,
  userId,
}: PlanificationClientProps) {
  // Suppression des avertissements pour variables préfixées avec _
  void _collaborateurs;
  const router = useRouter();
  const [activeView, setActiveView] = useState<"gantt" | "suivi" | "alertes">("gantt");
  const [vueGantt, setVueGantt] = useState<"jour" | "semaine" | "mois">("semaine");
  const [filters, setFilters] = useState({
    site: "",
    affaire: "",
    responsable: "",
    statut: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiviteModal, setShowActiviteModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAffectationsModal, setShowAffectationsModal] = useState(false);
  const [selectedActiviteForAffectations, setSelectedActiviteForAffectations] = useState<ActivitePlanification | null>(null);
  const [editingActivite, setEditingActivite] = useState<ActivitePlanification | null>(null);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; nom_template: string; description?: string }>>([]);
  
  // Charger les templates au montage
  useEffect(() => {
    fetch("/api/planification/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch((err) => console.error("Erreur chargement templates:", err));
  }, []);

  // Filtrage des activités
  const filteredActivites = useMemo(() => {
    return activites.filter((activite) => {
      // Filtrer par site via l'affaire (le site est lié à l'affaire)
      if (filters.site && activite.affaire?.site_id && activite.affaire.site_id !== filters.site) return false;
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
    // Proposer d'abord le choix du template
    setShowTemplateModal(true);
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

  // Handler pour le drag & drop
  const handleDragEnd = async (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => {
    try {
      setSaving(true);
      await handleUpdateActivite(activiteId, {
        date_debut_prevue: nouvelleDateDebut.toISOString(),
        date_fin_prevue: nouvelleDateFin.toISOString(),
      });
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
    } finally {
      setSaving(false);
    }
  };

  // Handler pour le redimensionnement
  const handleResizeEnd = async (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => {
    try {
      setSaving(true);
      await handleUpdateActivite(activiteId, {
        date_debut_prevue: nouvelleDateDebut.toISOString(),
        date_fin_prevue: nouvelleDateFin.toISOString(),
      });
    } catch (error) {
      console.error("Erreur lors du redimensionnement:", error);
    } finally {
      setSaving(false);
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold text-secondary">
                Planning Gantt ({filteredActivites.length} activité{filteredActivites.length > 1 ? "s" : ""})
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={vueGantt}
                  onChange={(e) => setVueGantt(e.target.value as "jour" | "semaine" | "mois")}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="jour">Vue Jour</option>
                  <option value="semaine">Vue Semaine</option>
                  <option value="mois">Vue Mois</option>
                </select>
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
                {saving && (
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Enregistrement...
                  </span>
                )}
              </div>
            </div>
            
            {/* Section Affaires en attente de planification - visible uniquement pour planificateurs */}
            {isPlanificateur && (
              <>
                <AffairesEnAttente
                  userId={userId}
                  onCreateActivite={(affaireId) => {
                    // Pré-remplir le modal avec l'affaire sélectionnée
                    setEditingActivite({
                      id: "",
                      affaire_id: affaireId,
                    } as any);
                    setShowActiviteModal(true);
                  }}
                />
                {/* Section Affaires planifiées sans activités */}
                <AffairesPlanifiees
                  onCreateActivite={(affaireId) => {
                    // Pré-remplir le modal avec l'affaire sélectionnée
                    setEditingActivite({
                      id: "",
                      affaire_id: affaireId,
                    } as any);
                    setShowActiviteModal(true);
                  }}
                />
              </>
            )}

            {filteredActivites.length > 0 ? (
              <GanttTimeline
                activites={filteredActivites}
                vue={vueGantt}
                onActiviteClick={(activite) => {
                  // Ouvrir modal de détails ou édition
                  setEditingActivite(activite);
                  setShowActiviteModal(true);
                }}
                onDragEnd={isPlanificateur ? handleDragEnd : undefined}
                onResizeEnd={isPlanificateur ? handleResizeEnd : undefined}
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

        {/* Modal Sélection Template (avant création) */}
        {showTemplateModal && (
          <TemplateSelectorModal
            affaires={affaires}
            onSelectTemplate={handleApplyTemplate}
            onSkipTemplate={() => {
              setShowTemplateModal(false);
              setShowActiviteModal(true);
            }}
            onClose={() => {
              setShowTemplateModal(false);
              setShowActiviteModal(false);
              setEditingActivite(null);
            }}
          />
        )}

        {/* Modal Création/Édition Activité */}
        {showActiviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-primary">
                  {editingActivite?.id ? "Modifier l'activité" : "Nouvelle activité"}
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
              
              {/* Section Templates (uniquement en création) */}
              {!editingActivite?.id && (
                <div className="p-6 border-b bg-blue-50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Template de tâches (optionnel)</h3>
                  <div className="flex items-center gap-3">
                    <select
                      id="template-select"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      onChange={async (e) => {
                        const templateId = e.target.value;
                        if (!templateId) return;
                        
                        const affaireId = editingActivite?.affaire_id || filters.affaire;
                        if (!affaireId) {
                          alert("Veuillez d'abord sélectionner une affaire");
                          return;
                        }
                        
                        setSaving(true);
                        try {
                          const response = await fetch(`/api/planification/templates/apply`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              template_id: templateId,
                              affaire_id: affaireId,
                              date_debut_reference: new Date().toISOString(),
                            }),
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            alert(`Template appliqué avec succès ! ${data.count} tâche(s) créée(s).`);
                            setShowActiviteModal(false);
                            setEditingActivite(null);
                            router.refresh();
                          } else {
                            const error = await response.json();
                            alert(`Erreur: ${error.error || "Erreur inconnue"}`);
                          }
                        } catch (error) {
                          console.error("Erreur:", error);
                          alert("Une erreur est survenue lors de l'application du template");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <option value="">Aucun template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.nom_template}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">Les tâches seront créées automatiquement</span>
                  </div>
                </div>
              )}

              <form
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);

                  const formData = new FormData(e.currentTarget);
                  const payload: any = {
                    affaire_id: formData.get("affaire_id") as string,
                    lot_id: formData.get("lot_id") || null,
                    libelle: formData.get("libelle") as string,
                    description: formData.get("description") || null,
                    date_debut_prevue: formData.get("date_debut_prevue") as string,
                    date_fin_prevue: formData.get("date_fin_prevue") as string,
                    responsable_id: formData.get("responsable_id") || null,
                    heures_prevues: parseFloat(formData.get("heures_prevues") as string) || 0,
                    type_horaire: formData.get("type_horaire") as string || "jour",
                    coefficient: parseFloat(formData.get("coefficient") as string) || 1.0,
                  };
                  
                  // Nouveaux champs hiérarchie
                  const parentId = formData.get("parent_id") as string;
                  if (parentId) payload.parent_id = parentId;
                  
                  // Nouveaux champs dépendances
                  const activitePrecedenteId = formData.get("activite_precedente_id") as string;
                  const typeDependance = formData.get("type_dependance") as string;
                  if (activitePrecedenteId) payload.activite_precedente_id = activitePrecedenteId;
                  if (typeDependance) payload.type_dependance = typeDependance;
                  
                  // Nouveaux champs jours ouvrés
                  const dureeJoursOuvres = formData.get("duree_jours_ouvres") as string;
                  const calculAutoDateFin = formData.get("calcul_auto_date_fin") === "true";
                  if (dureeJoursOuvres) payload.duree_jours_ouvres = parseInt(dureeJoursOuvres);
                  payload.calcul_auto_date_fin = calculAutoDateFin;

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
                      <option value="jour">Jour (HN 5/7)</option>
                      <option value="nuit">Nuit</option>
                      <option value="weekend">Week-end</option>
                      <option value="ferie">Férié</option>
                      <option value="3x8">3x8</option>
                      <option value="accelerer">Accéléré</option>
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

                  {/* Section Hiérarchie */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Hiérarchie</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tâche parente (pour créer une sous-tâche)
                      </label>
                      <select
                        name="parent_id"
                        defaultValue={editingActivite?.parent_id || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Aucune (tâche principale)</option>
                        {activites
                          .filter((a) => a.affaire_id === (editingActivite?.affaire_id || filters.affaire))
                          .filter((a) => !editingActivite || a.id !== editingActivite.id)
                          .map((activite) => (
                            <option key={activite.id} value={activite.id}>
                              {activite.numero_hierarchique || "•"} {activite.libelle}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Section Dépendances */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Dépendances</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tâche précédente
                        </label>
                        <select
                          name="activite_precedente_id"
                          defaultValue={editingActivite?.activite_precedente_id || ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Aucune dépendance</option>
                          {activites
                            .filter((a) => a.affaire_id === (editingActivite?.affaire_id || filters.affaire))
                            .filter((a) => !editingActivite || a.id !== editingActivite.id)
                            .map((activite) => (
                              <option key={activite.id} value={activite.id}>
                                {activite.numero_hierarchique || "•"} {activite.libelle}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type de dépendance
                        </label>
                        <select
                          name="type_dependance"
                          defaultValue={editingActivite?.type_dependance || ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="FS">Fin → Début (FS)</option>
                          <option value="SS">Début → Début (SS)</option>
                          <option value="FF">Fin → Fin (FF)</option>
                          <option value="SF">Début → Fin (SF)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Les dates seront calculées automatiquement
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Jours ouvrés */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Durée en jours ouvrés</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée (jours ouvrés)
                        </label>
                        <input
                          type="number"
                          name="duree_jours_ouvres"
                          min="1"
                          defaultValue={editingActivite?.duree_jours_ouvres || ""}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Ex: 5"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Exclut weekends et jours fériés
                        </p>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="calcul_auto_date_fin"
                            value="true"
                            defaultChecked={editingActivite?.calcul_auto_date_fin || false}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            Calculer automatiquement la date de fin
                          </span>
                        </label>
                      </div>
                    </div>
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

