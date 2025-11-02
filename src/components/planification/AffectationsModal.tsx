"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Clock } from "lucide-react";
import type { ActivitePlanification, AffectationPlanification } from "@/types/planification";

interface AffectationsModalProps {
  activite: ActivitePlanification;
  affectations: AffectationPlanification[];
  collaborateurs: Array<{ id: string; nom: string; prenom: string }>;
  onClose: () => void;
  onRefresh: () => void;
}

export default function AffectationsModal({
  activite,
  affectations: initialAffectations,
  collaborateurs,
  onClose,
  onRefresh,
}: AffectationsModalProps) {
  const [affectations, setAffectations] = useState(initialAffectations);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddAffectation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      activite_id: activite.id,
      collaborateur_id: formData.get("collaborateur_id") as string,
      date_debut_affectation: formData.get("date_debut_affectation") as string,
      date_fin_affectation: formData.get("date_fin_affectation") as string,
      heures_prevues_affectees: parseFloat(formData.get("heures_prevues_affectees") as string) || 0,
      type_horaire: formData.get("type_horaire") as string || "jour",
      coefficient: parseFloat(formData.get("coefficient") as string) || 1.0,
    };

    try {
      const response = await fetch("/api/planification/affectations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setAffectations([...affectations, data.affectation]);
        setShowAddForm(false);
        (e.target as HTMLFormElement).reset();
        onRefresh();
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
  };

  const handleUpdateTypeHoraire = async (affectationId: string, nouveauType: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/planification/affectations/${affectationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type_horaire: nouveauType }),
      });

      if (response.ok) {
        const data = await response.json();
        setAffectations(
          affectations.map((a) => (a.id === affectationId ? data.affectation : a))
        );
        onRefresh();
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAffectation = async (affectationId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette affectation ?")) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/planification/affectations/${affectationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAffectations(affectations.filter((a) => a.id !== affectationId));
        onRefresh();
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-primary">Affectations - {activite.libelle}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gérer les ressources affectées à cette activité
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Liste des affectations */}
          <div className="space-y-3">
            {affectations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Aucune affectation</p>
              </div>
            ) : (
              affectations.map((affectation) => (
                <div
                  key={affectation.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-800">
                          {affectation.collaborateur?.prenom} {affectation.collaborateur?.nom}
                        </h3>
                        <select
                          value={affectation.type_horaire}
                          onChange={(e) => handleUpdateTypeHoraire(affectation.id, e.target.value)}
                          disabled={saving}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary"
                        >
                          <option value="jour">HN 5/7 (Lun-Ven)</option>
                          <option value="nuit">3/8 (Nuit)</option>
                          <option value="weekend">Week-end</option>
                          <option value="ferie">Férié</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Début:</span>{" "}
                          {new Date(affectation.date_debut_affectation).toLocaleDateString("fr-FR")}
                        </div>
                        <div>
                          <span className="font-medium">Fin:</span>{" "}
                          {new Date(affectation.date_fin_affectation).toLocaleDateString("fr-FR")}
                        </div>
                        <div>
                          <span className="font-medium">Heures:</span>{" "}
                          {affectation.heures_prevues_affectees}h
                        </div>
                        <div>
                          <span className="font-medium">Coefficient:</span> {affectation.coefficient}x
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAffectation(affectation.id)}
                      disabled={saving}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">Ajouter une affectation</h3>
              <form onSubmit={handleAddAffectation} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collaborateur <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="collaborateur_id"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Sélectionner...</option>
                      {collaborateurs.map((collab) => (
                        <option key={collab.id} value={collab.id}>
                          {collab.prenom} {collab.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type horaire <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type_horaire"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="jour">HN 5/7 (Lun-Ven)</option>
                      <option value="nuit">3/8 (Nuit)</option>
                      <option value="weekend">Week-end</option>
                      <option value="ferie">Férié</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="date_debut_affectation"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="date_fin_affectation"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heures prévues
                    </label>
                    <input
                      type="number"
                      name="heures_prevues_affectees"
                      step="0.5"
                      min="0"
                      defaultValue={0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coefficient
                    </label>
                    <input
                      type="number"
                      name="coefficient"
                      step="0.1"
                      min="1"
                      defaultValue={1.0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-4 py-2"
                  >
                    {saving ? "Ajout..." : "Ajouter"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter une affectation
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

