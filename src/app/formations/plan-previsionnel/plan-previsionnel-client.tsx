"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, CheckCircle, XCircle, AlertTriangle, TrendingUp, Filter } from "lucide-react";
import Modal from "@/components/rh/Modal";
import type { PlanPrevisionnelFormation } from "@/types/rh";

interface PlanPrevisionnelClientProps {
  initialPlan: PlanPrevisionnelFormation[];
  collaborateurs: Array<{ id: string; nom: string; prenom: string; email: string }>;
  catalogue: Array<{ id: string; nom: string; code_interne?: string | null; categorie?: string | null; cout_unitaire?: number | null }>;
  hasRHAccess: boolean;
  currentYear: number;
  nextYear: number;
}

export default function PlanPrevisionnelClient({
  initialPlan,
  collaborateurs,
  catalogue,
  hasRHAccess,
  currentYear,
  nextYear,
}: PlanPrevisionnelClientProps) {
  const router = useRouter();
  const [plan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlanPrevisionnelFormation | null>(null);
  const [filters, setFilters] = useState({
    annee: nextYear.toString(),
    statut: "",
    site: "",
    collaborateur: "",
    categorie: "",
  });

  const [formData, setFormData] = useState({
    collaborateur_id: "",
    catalogue_formation_id: "",
    formation_libelle: "",
    periode_annee: nextYear,
    periode_mois: "",
    periode_trimestre: "",
    date_cible: "",
    priorite: "moyenne" as "haute" | "moyenne" | "basse",
    budget_estime: "",
    commentaire_demandeur: "",
  });

  // Filtrage des données
  const filteredPlan = useMemo(() => {
    return plan.filter((item) => {
      if (filters.annee && item.periode_annee !== parseInt(filters.annee)) return false;
      if (filters.statut && item.statut_validation !== filters.statut) return false;
      if (filters.collaborateur && item.collaborateur_id !== filters.collaborateur) return false;
      if (filters.categorie && item.catalogue_formation?.categorie !== filters.categorie) return false;
      return true;
    });
  }, [plan, filters]);

  // Statistiques
  const stats = useMemo(() => {
    const filtered = filteredPlan;
    return {
      total: filtered.length,
      en_attente: filtered.filter((p) => p.statut_validation === "en_attente").length,
      valide: filtered.filter((p) => p.statut_validation === "valide").length,
      refuse: filtered.filter((p) => p.statut_validation === "refusé").length,
      budget_total: filtered.reduce((sum, p) => sum + (p.budget_estime || 0), 0),
    };
  }, [filteredPlan]);

  const resetForm = () => {
    setFormData({
      collaborateur_id: "",
      catalogue_formation_id: "",
      formation_libelle: "",
      periode_annee: nextYear,
      periode_mois: "",
      periode_trimestre: "",
      date_cible: "",
      priorite: "moyenne",
      budget_estime: "",
      commentaire_demandeur: "",
    });
    setSelectedItem(null);
    setError(null);
    setSuccess(null);
  };

  const handleOpenModal = (item?: PlanPrevisionnelFormation) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        collaborateur_id: item.collaborateur_id,
        catalogue_formation_id: item.catalogue_formation_id || "",
        formation_libelle: item.formation_libelle || "",
        periode_annee: item.periode_annee,
        periode_mois: item.periode_mois?.toString() || "",
        periode_trimestre: item.periode_trimestre?.toString() || "",
        date_cible: item.date_cible || "",
        priorite: item.priorite || "moyenne",
        budget_estime: item.budget_estime?.toString() || "",
        commentaire_demandeur: item.commentaire_demandeur || "",
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
        periode_annee: formData.periode_annee,
        priorite: formData.priorite,
        commentaire_demandeur: formData.commentaire_demandeur.trim() || null,
        budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
      };

      if (formData.catalogue_formation_id) {
        payload.catalogue_formation_id = formData.catalogue_formation_id;
        // Récupérer le coût depuis le catalogue
        const selectedCatalogue = catalogue.find(c => c.id === formData.catalogue_formation_id);
        if (selectedCatalogue?.cout_unitaire && !formData.budget_estime) {
          payload.budget_estime = selectedCatalogue.cout_unitaire;
        }
      } else if (formData.formation_libelle) {
        payload.formation_libelle = formData.formation_libelle.trim();
      }

      if (formData.date_cible) {
        payload.date_cible = formData.date_cible;
        const date = new Date(formData.date_cible);
        payload.periode_mois = date.getMonth() + 1;
        payload.periode_trimestre = Math.ceil((date.getMonth() + 1) / 3);
      } else if (formData.periode_mois) {
        payload.periode_mois = parseInt(formData.periode_mois);
        payload.periode_trimestre = Math.ceil(parseInt(formData.periode_mois) / 3);
      } else if (formData.periode_trimestre) {
        payload.periode_trimestre = parseInt(formData.periode_trimestre);
      }

      const url = selectedItem
        ? `/api/formations/plan-previsionnel/${selectedItem.id}`
        : "/api/formations/plan-previsionnel";

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

      setSuccess(selectedItem ? "Plan prévisionnel mis à jour" : "Demande créée avec succès");
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

  const handleValidate = async (id: string, action: 'valide' | 'refusé', motif?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/formations/plan-previsionnel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut_validation: action,
          motif_refus: action === 'refusé' ? motif : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la validation");
      }

      setSuccess(`Plan prévisionnel ${action === 'valide' ? 'validé' : 'refusé'} avec succès`);
      router.refresh();
      setValidationModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToFormation = async (id: string) => {
    if (!confirm("Convertir ce plan prévisionnel en formation réelle ?")) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/formations/plan-previsionnel/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la conversion");
      }

      setSuccess("Formation créée avec succès");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const categoriesUniques = Array.from(
    new Set(catalogue.map(c => c.categorie).filter((cat): cat is string => Boolean(cat)))
  ).sort();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
              Plan Prévisionnel des Formations
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Gérer les besoins de formation pour l&apos;année {nextYear}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nouvelle demande
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
          <div className="card border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">En attente</div>
            <div className="text-2xl font-bold text-orange-600">{stats.en_attente}</div>
          </div>
          <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Validées</div>
            <div className="text-2xl font-bold text-green-600">{stats.valide}</div>
          </div>
          <div className="card border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Refusées</div>
            <div className="text-2xl font-bold text-red-600">{stats.refuse}</div>
          </div>
          <div className="card border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <div className="text-sm text-gray-600 mb-1">Budget total</div>
            <div className="text-2xl font-bold text-blue-600">{stats.budget_total.toFixed(0)} €</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">Filtres</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
              <select
                value={filters.annee}
                onChange={(e) => setFilters({ ...filters, annee: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Toutes</option>
                <option value={currentYear.toString()}>{currentYear}</option>
                <option value={nextYear.toString()}>{nextYear}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="valide">Validé</option>
                <option value="refusé">Refusé</option>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={filters.categorie}
                onChange={(e) => setFilters({ ...filters, categorie: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Toutes</option>
                {categoriesUniques.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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
                    Période
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Priorité
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden xl:table-cell">
                    Budget
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  {hasRHAccess && (
                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlan.length === 0 ? (
                  <tr>
                    <td colSpan={hasRHAccess ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                      Aucune demande de formation
                    </td>
                  </tr>
                ) : (
                  filteredPlan.map((item) => (
                    <tr key={item.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.collaborateur?.prenom} {item.collaborateur?.nom}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {item.periode_trimestre ? `T${item.periode_trimestre} ${item.periode_annee}` : item.periode_annee}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.catalogue_formation?.nom || item.formation_libelle}
                        </div>
                        {item.catalogue_formation?.categorie && (
                          <div className="text-xs text-gray-500">{item.catalogue_formation.categorie}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {item.date_cible ? (
                          <div>{new Date(item.date_cible).toLocaleDateString('fr-FR')}</div>
                        ) : item.periode_trimestre ? (
                          <div>T{item.periode_trimestre} {item.periode_annee}</div>
                        ) : (
                          <div>{item.periode_annee}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          item.priorite === 'haute' ? 'bg-red-100 text-red-800 border-red-300' :
                          item.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {item.priorite || 'moyenne'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {item.budget_estime ? `${item.budget_estime.toFixed(0)} €` : "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          item.statut_validation === 'valide' ? 'bg-green-100 text-green-800 border-green-300' :
                          item.statut_validation === 'refusé' ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-orange-100 text-orange-800 border-orange-300'
                        }`}>
                          {item.statut_validation}
                        </span>
                      </td>
                      {hasRHAccess && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {item.statut_validation === 'valide' && !item.convertie_en_formation_id && (
                              <button
                                onClick={() => handleConvertToFormation(item.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Convertir en formation"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </button>
                            )}
                            {item.statut_validation === 'en_attente' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setValidationModalOpen(true);
                                  }}
                                  className="text-green-600 hover:text-green-800"
                                  title="Valider"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setValidationModalOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Refuser"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="text-primary hover:text-primary-dark"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
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

      {/* Modal création/édition */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={selectedItem ? "Modifier le plan prévisionnel" : "Nouvelle demande de formation"}
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
                <option value="">Sélectionner un collaborateur</option>
                {collaborateurs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formation
              </label>
              <select
                value={formData.catalogue_formation_id}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    catalogue_formation_id: e.target.value,
                    formation_libelle: ""
                  });
                  // Auto-remplir le budget
                  const selected = catalogue.find(c => c.id === e.target.value);
                  if (selected?.cout_unitaire) {
                    setFormData(prev => ({ ...prev, budget_estime: selected.cout_unitaire!.toString() }));
                  }
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
              <p className="text-xs text-gray-500 mt-1">ou</p>
              <input
                type="text"
                value={formData.formation_libelle}
                onChange={(e) => setFormData({ ...formData, formation_libelle: e.target.value, catalogue_formation_id: "" })}
                placeholder="Formation hors catalogue..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary mt-1"
                disabled={!!formData.catalogue_formation_id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année *
              </label>
              <input
                type="number"
                required
                value={formData.periode_annee}
                onChange={(e) => setFormData({ ...formData, periode_annee: parseInt(e.target.value) })}
                min={currentYear}
                max={nextYear + 5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date cible (optionnel)
              </label>
              <input
                type="date"
                value={formData.date_cible}
                onChange={(e) => setFormData({ ...formData, date_cible: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trimestre
              </label>
              <select
                value={formData.periode_trimestre}
                onChange={(e) => setFormData({ ...formData, periode_trimestre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Sélectionner...</option>
                <option value="1">T1 (Jan-Mar)</option>
                <option value="2">T2 (Avr-Juin)</option>
                <option value="3">T3 (Juil-Sep)</option>
                <option value="4">T4 (Oct-Déc)</option>
              </select>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget estimé (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_estime}
                onChange={(e) => setFormData({ ...formData, budget_estime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire
              </label>
              <textarea
                value={formData.commentaire_demandeur}
                onChange={(e) => setFormData({ ...formData, commentaire_demandeur: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Justification de la demande, besoins..."
              />
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

      {/* Modal validation */}
      {selectedItem && (
        <Modal
          isOpen={validationModalOpen}
          onClose={() => {
            setValidationModalOpen(false);
            setSelectedItem(null);
          }}
          title="Valider ou refuser le plan prévisionnel"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>{selectedItem.collaborateur?.prenom} {selectedItem.collaborateur?.nom}</strong> -{" "}
                {selectedItem.catalogue_formation?.nom || selectedItem.formation_libelle}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleValidate(selectedItem.id, 'valide')}
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Valider
              </button>
              <button
                onClick={() => {
                  const motif = prompt("Motif du refus (optionnel):");
                  if (motif !== null) {
                    handleValidate(selectedItem.id, 'refusé', motif);
                  }
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 inline mr-2" />
                Refuser
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

