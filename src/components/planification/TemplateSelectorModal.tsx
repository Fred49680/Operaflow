"use client";

import { useState, useEffect } from "react";
import { X, Calendar, FileText } from "lucide-react";

interface Template {
  id: string;
  nom_template: string;
  description?: string | null;
  categorie?: string | null;
  taches?: Array<{
    id: string;
    libelle: string;
    duree_jours_ouvres?: number | null;
  }>;
}

interface TemplateSelectorModalProps {
  affaires: Array<{ id: string; numero: string; libelle: string }>;
  onSelectTemplate: (templateId: string, affaireId: string, dateDebut: string) => void;
  onSkipTemplate: () => void;
  onClose: () => void;
}

export default function TemplateSelectorModal({
  affaires,
  onSelectTemplate,
  onSkipTemplate,
  onClose,
}: TemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedAffaire, setSelectedAffaire] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>("");
  const [useTemplate, setUseTemplate] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
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

  const handleContinue = () => {
    if (useTemplate && selectedTemplate && selectedAffaire && dateDebut) {
      onSelectTemplate(selectedTemplate, selectedAffaire, dateDebut);
    } else {
      onSkipTemplate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-primary">Créer une activité</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">
                Utiliser un template de tâches préfait
              </span>
            </label>

            {useTemplate && (
              <div className="space-y-4 pl-6 border-l-2 border-primary">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Chargement...</div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Aucun template disponible</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Sélectionner un template</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.nom_template}
                            {template.categorie && ` (${template.categorie})`}
                            {template.taches && ` - ${template.taches.length} tâche${template.taches.length > 1 ? "s" : ""}`}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {templates.find((t) => t.id === selectedTemplate)?.description || ""}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Affaire <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedAffaire}
                        onChange={(e) => setSelectedAffaire(e.target.value)}
                        required={useTemplate}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de début de base <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dateDebut}
                        onChange={(e) => setDateDebut(e.target.value)}
                        required={useTemplate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Les tâches du template seront appliquées à partir de cette date
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="btn-primary px-4 py-2"
              disabled={useTemplate && (!selectedTemplate || !selectedAffaire || !dateDebut)}
            >
              {useTemplate ? "Appliquer le template" : "Créer sans template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

