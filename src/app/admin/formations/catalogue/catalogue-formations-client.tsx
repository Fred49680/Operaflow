"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, CheckCircle, AlertTriangle } from "lucide-react";
import Modal from "@/components/rh/Modal";
import type { CatalogueFormation } from "@/types/rh";

interface CatalogueFormationsClientProps {
  initialCatalogue: CatalogueFormation[];
  availableCompetences: Array<{ id: string; libelle: string; code?: string | null }>;
}

export default function CatalogueFormationsClient({
  initialCatalogue,
  availableCompetences,
}: CatalogueFormationsClientProps) {
  const router = useRouter();
  const [catalogue] = useState<CatalogueFormation[]>(initialCatalogue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogueFormation | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    code_interne: "",
    description: "",
    categorie: "",
    type_formation: "" as "obligatoire" | "facultative" | "reglementaire" | "",
    duree_heures: "",
    duree_jours: "",
    periodicite_validite_mois: "",
    cout_unitaire: "",
    organisme_formateur: "",
    support_preuve: "",
    is_active: true,
    competences: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      nom: "",
      code_interne: "",
      description: "",
      categorie: "",
      type_formation: "",
      duree_heures: "",
      duree_jours: "",
      periodicite_validite_mois: "",
      cout_unitaire: "",
      organisme_formateur: "",
      support_preuve: "",
      is_active: true,
      competences: [],
    });
    setSelectedItem(null);
    setError(null);
    setSuccess(null);
  };

  const handleOpenModal = (item?: CatalogueFormation) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        nom: item.nom,
        code_interne: item.code_interne || "",
        description: item.description || "",
        categorie: item.categorie || "",
        type_formation: item.type_formation || "",
        duree_heures: item.duree_heures?.toString() || "",
        duree_jours: item.duree_jours?.toString() || "",
        periodicite_validite_mois: item.periodicite_validite_mois?.toString() || "",
        cout_unitaire: item.cout_unitaire?.toString() || "",
        organisme_formateur: item.organisme_formateur || "",
        support_preuve: item.support_preuve || "",
        is_active: item.is_active,
        competences: item.competences?.map(c => c.id) || [],
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
        nom: formData.nom.trim(),
        code_interne: formData.code_interne.trim() || null,
        description: formData.description.trim() || null,
        categorie: formData.categorie.trim() || null,
        type_formation: formData.type_formation || null,
        duree_heures: formData.duree_heures ? parseFloat(formData.duree_heures) : null,
        duree_jours: formData.duree_jours ? parseFloat(formData.duree_jours) : null,
        periodicite_validite_mois: formData.periodicite_validite_mois ? parseInt(formData.periodicite_validite_mois) : null,
        cout_unitaire: formData.cout_unitaire ? parseFloat(formData.cout_unitaire) : null,
        organisme_formateur: formData.organisme_formateur.trim() || null,
        support_preuve: formData.support_preuve.trim() || null,
        is_active: formData.is_active,
      };

      const url = selectedItem
        ? `/api/formations/catalogue/${selectedItem.id}`
        : "/api/formations/catalogue";

      const method = selectedItem ? "PATCH" : "POST";
      const bodyData = { ...payload, competences: formData.competences };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      setSuccess(selectedItem ? "Formation mise à jour avec succès" : "Formation créée avec succès");
      
      // Rafraîchir la liste
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

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/formations/catalogue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  };


  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
              Catalogue des Formations
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Gérez le référentiel des formations disponibles
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Ajouter une formation
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

        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden md:table-cell">
                    Code
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Catégorie
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden xl:table-cell">
                    Durée
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden xl:table-cell">
                    Validité
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-bold text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {catalogue.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Aucune formation enregistrée
                    </td>
                  </tr>
                ) : (
                  catalogue.map((formation) => (
                    <tr key={formation.id} className="hover:bg-primary/5 cursor-pointer transition-colors duration-150">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{formation.nom}</div>
                        <div className="text-xs text-gray-500 md:hidden mt-1">
                          {formation.code_interne && `${formation.code_interne} • `}
                          {formation.categorie}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {formation.code_interne || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {formation.categorie || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {formation.type_formation || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                        {formation.duree_jours ? `${formation.duree_jours} j` : formation.duree_heures ? `${formation.duree_heures} h` : "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                        {formation.periodicite_validite_mois ? `${formation.periodicite_validite_mois} mois` : "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(formation.id, formation.is_active)}
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all hover:scale-105 ${
                            formation.is_active
                              ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                              : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          {formation.is_active ? "Actif" : "Inactif"}
                        </button>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la formation *
              </label>
              <input
                type="text"
                required
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code interne
              </label>
              <input
                type="text"
                value={formData.code_interne}
                onChange={(e) => setFormData({ ...formData, code_interne: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <input
                type="text"
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                placeholder="Ex: Sécurité, Technique, Qualité..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de formation
              </label>
              <select
                value={formData.type_formation}
                onChange={(e) => setFormData({ ...formData, type_formation: e.target.value as "obligatoire" | "facultative" | "reglementaire" | "" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Sélectionner...</option>
                <option value="obligatoire">Obligatoire</option>
                <option value="facultative">Facultative</option>
                <option value="reglementaire">Réglementaire</option>
              </select>
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
                Durée (jours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.duree_jours}
                onChange={(e) => setFormData({ ...formData, duree_jours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Périodicité validité (mois)
              </label>
              <input
                type="number"
                min="0"
                value={formData.periodicite_validite_mois}
                onChange={(e) => setFormData({ ...formData, periodicite_validite_mois: e.target.value })}
                placeholder="Ex: 36 pour 3 ans"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coût unitaire (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cout_unitaire}
                onChange={(e) => setFormData({ ...formData, cout_unitaire: e.target.value })}
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
                Support de preuve
              </label>
              <input
                type="text"
                value={formData.support_preuve}
                onChange={(e) => setFormData({ ...formData, support_preuve: e.target.value })}
                placeholder="Ex: attestation, certificat..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compétences associées
              </label>
              <select
                multiple
                size={5}
                value={formData.competences}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, competences: selected });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {availableCompetences.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.code ? `${comp.code} - ` : ""}{comp.libelle}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Maintenez Ctrl/Cmd pour sélectionner plusieurs compétences
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Formation active</span>
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

