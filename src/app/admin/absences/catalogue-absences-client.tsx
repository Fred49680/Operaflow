"use client";

import { useState } from "react";
import { Plus, Edit, X, Check, AlertCircle } from "lucide-react";
import type { CatalogueAbsence } from "@/types/rh";

interface CatalogueAbsencesClientProps {
  initialCatalogue: CatalogueAbsence[];
}

export default function CatalogueAbsencesClient({
  initialCatalogue,
}: CatalogueAbsencesClientProps) {
  const [catalogue, setCatalogue] = useState<CatalogueAbsence[]>(initialCatalogue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogueAbsence | null>(null);
  const [formData, setFormData] = useState<{
    code: string;
    libelle: string;
    description: string;
    categorie: "exceptionnelle" | "legale" | "autorisee" | "conges" | "non_remuneree";
    duree_max_jours: number | null;
    duree_min_jours: number | null;
    besoin_justificatif: boolean;
    besoin_validation_n1: boolean;
    besoin_validation_rh: boolean;
    motif_complementaire: string;
    conditions_particulieres: string;
    is_active: boolean;
  }>({
    code: "",
    libelle: "",
    description: "",
    categorie: "legale",
    duree_max_jours: null,
    duree_min_jours: null,
    besoin_justificatif: false,
    besoin_validation_n1: true,
    besoin_validation_rh: true,
    motif_complementaire: "",
    conditions_particulieres: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      code: "",
      libelle: "",
      description: "",
      categorie: "legale",
      duree_max_jours: null,
      duree_min_jours: null,
      besoin_justificatif: false,
      besoin_validation_n1: true,
      besoin_validation_rh: true,
      motif_complementaire: "",
      conditions_particulieres: "",
      is_active: true,
    });
    setSelectedItem(null);
    setError(null);
    setSuccess(null);
  };

  const handleOpenModal = (item?: CatalogueAbsence) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        code: item.code,
        libelle: item.libelle,
        description: item.description || "",
        categorie: item.categorie,
        duree_max_jours: item.duree_max_jours || null,
        duree_min_jours: item.duree_min_jours || null,
        besoin_justificatif: item.besoin_justificatif,
        besoin_validation_n1: item.besoin_validation_n1,
        besoin_validation_rh: item.besoin_validation_rh,
        motif_complementaire: item.motif_complementaire || "",
        conditions_particulieres: item.conditions_particulieres || "",
        is_active: item.is_active,
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
      const url = selectedItem
        ? `/api/rh/catalogue-absences/${selectedItem.id}`
        : "/api/rh/catalogue-absences";
      const method = selectedItem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }

      const data = await response.json();
      setSuccess(
        selectedItem ? "Type d'absence mis à jour" : "Type d'absence créé"
      );

      // Mettre à jour la liste
      if (selectedItem) {
        setCatalogue(
          catalogue.map((item) => (item.id === selectedItem.id ? data : item))
        );
      } else {
        setCatalogue([...catalogue, data]);
      }

      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rh/catalogue-absences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification");
      }

      const data = await response.json();
      setCatalogue(
        catalogue.map((item) => (item.id === id ? data : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const categorieLabels: Record<string, string> = {
    exceptionnelle: "Exceptionnelle",
    legale: "Légale",
    autorisee: "Autorisée",
    conges: "Congés",
    non_remuneree: "Non rémunérée",
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-r-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4 rounded-r-lg">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            <p>{success}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Ajouter un type d&apos;absence
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Libellé
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Validation
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {catalogue.map((item) => (
                <tr key={item.id} className="hover:bg-primary/5 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.libelle}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {categorieLabels[item.categorie] || item.categorie}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.besoin_validation_n1 && (
                      <span className="inline-block mr-2">N+1</span>
                    )}
                    {item.besoin_validation_rh && (
                      <span className="inline-block">RH</span>
                    )}
                    {!item.besoin_validation_n1 && !item.besoin_validation_rh && (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="text-primary hover:text-primary/80 p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(item.id, item.is_active)}
                        className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={item.is_active ? "Désactiver" : "Activer"}
                      >
                        {item.is_active ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulaire */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedItem ? "Modifier" : "Ajouter"} un type d&apos;absence
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: CP, RTT, MALADIE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Libellé <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.libelle}
                    onChange={(e) =>
                      setFormData({ ...formData, libelle: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: Congés payés"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.categorie}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      categorie: e.target.value as "exceptionnelle" | "legale" | "autorisee" | "conges" | "non_remuneree",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="legale">Légale</option>
                  <option value="exceptionnelle">Exceptionnelle</option>
                  <option value="autorisee">Autorisée</option>
                  <option value="conges">Congés</option>
                  <option value="non_remuneree">Non rémunérée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Description du type d'absence..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée min (jours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duree_min_jours || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duree_min_jours: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée max (jours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duree_max_jours || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duree_max_jours: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.besoin_justificatif}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        besoin_justificatif: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Besoin de justificatif
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.besoin_validation_n1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        besoin_validation_n1: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Nécessite validation N+1
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.besoin_validation_rh}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        besoin_validation_rh: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Nécessite validation RH
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Actif</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif complémentaire
                </label>
                <textarea
                  value={formData.motif_complementaire}
                  onChange={(e) =>
                    setFormData({ ...formData, motif_complementaire: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Précisions locales..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conditions particulières
                </label>
                <textarea
                  value={formData.conditions_particulieres}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions_particulieres: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ex: Uniquement sur présentation d'un justificatif"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {selectedItem ? "Modifier" : "Créer"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

