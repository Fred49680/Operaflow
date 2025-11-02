"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, Save } from "lucide-react";

interface Template {
  id: string;
  nom_template: string;
  description?: string | null;
  categorie?: string | null;
  actif: boolean;
  taches?: Array<{
    id: string;
    libelle: string;
    description?: string | null;
    duree_jours_ouvres?: number | null;
    type_horaire?: string;
    heures_prevues?: number;
    niveau_hierarchie?: number;
    ordre_affichage?: number;
  }>;
}

interface GestionTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GestionTemplatesModal({
  isOpen,
  onClose,
}: GestionTemplatesModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    nom_template: "",
    description: "",
    categorie: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/planification/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Erreur récupération templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ nom_template: "", description: "", categorie: "" });
    setShowCreateModal(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      nom_template: template.nom_template,
      description: template.description || "",
      categorie: template.categorie || "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate
        ? `/api/planification/templates/${editingTemplate.id}`
        : "/api/planification/templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) return;

    try {
      const response = await fetch(`/api/planification/templates/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTemplates();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-primary">Gestion des Templates</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                className="btn-primary flex items-center gap-2 px-4 py-2"
              >
                <Plus className="h-4 w-4" />
                Nouveau template
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Aucun template disponible</p>
                <button
                  onClick={handleCreate}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  Créer le premier template
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800">
                          {template.nom_template}
                        </h3>
                        {template.categorie && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                            {template.categorie}
                          </span>
                        )}
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-2">
                            {template.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          {template.taches?.length || 0} tâche(s) dans ce template
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Création/Édition */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-primary">
                {editingTemplate ? "Modifier le template" : "Nouveau template"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom_template}
                  onChange={(e) =>
                    setFormData({ ...formData, nom_template: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ex: Chantier standard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={formData.categorie}
                  onChange={(e) =>
                    setFormData({ ...formData, categorie: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ex: Chantier, Maintenance, Rénovation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Description du template..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingTemplate ? "Modifier" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

