"use client";

import { useState, useEffect } from "react";
import { createClientSupabase } from "@/lib/supabase/client";

interface CompetenceFormProps {
  collaborateurId: string;
  competence?: {
    id: string;
    competence_id: string;
    niveau?: string | null;
    date_obtention?: string | null;
    date_expiration?: string | null;
    statut: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Competence {
  id: string;
  code: string;
  libelle: string;
  description?: string | null;
  categorie?: string | null;
}

export default function CompetenceForm({
  collaborateurId,
  competence,
  onClose,
  onSuccess,
}: CompetenceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competencesDisponibles, setCompetencesDisponibles] = useState<Competence[]>([]);
  const [loadingCompetences, setLoadingCompetences] = useState(true);
  const [formData, setFormData] = useState({
    competence_id: competence?.competence_id || "",
    niveau: competence?.niveau || "base",
    date_obtention: competence?.date_obtention
      ? new Date(competence.date_obtention).toISOString().split("T")[0]
      : "",
    date_expiration: competence?.date_expiration
      ? new Date(competence.date_expiration).toISOString().split("T")[0]
      : "",
    statut: competence?.statut || "valide",
  });

  useEffect(() => {
    const fetchCompetences = async () => {
      try {
        const response = await fetch("/api/rh/competences");
        if (!response.ok) throw new Error("Erreur lors de la récupération");
        const data = await response.json();
        setCompetencesDisponibles(data.competences || []);
      } catch (err) {
        console.error("Erreur récupération compétences:", err);
        setError("Erreur lors du chargement des compétences disponibles");
      } finally {
        setLoadingCompetences(false);
      }
    };
    fetchCompetences();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = {
        collaborateur_id: collaborateurId,
        competence_id: formData.competence_id,
        niveau: formData.niveau,
        date_obtention: formData.date_obtention || null,
        date_expiration: formData.date_expiration || null,
        statut: formData.statut,
      };

      if (competence) {
        // Mise à jour
        const response = await fetch(`/api/rh/collaborateurs-competences/${competence.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de la mise à jour");
        }
      } else {
        // Création
        const response = await fetch("/api/rh/collaborateurs-competences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de la création");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Compétence *
          </label>
          {loadingCompetences ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              Chargement des compétences...
            </div>
          ) : (
            <select
              required
              value={formData.competence_id}
              onChange={(e) => setFormData({ ...formData, competence_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
              disabled={!!competence}
            >
              <option value="">Sélectionner une compétence</option>
              {competencesDisponibles.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.code ? `${comp.code} - ` : ""}{comp.libelle}
                  {comp.categorie ? ` (${comp.categorie})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Niveau *
          </label>
          <select
            required
            value={formData.niveau}
            onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
          >
            <option value="base">Base</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut *
          </label>
          <select
            required
            value={formData.statut}
            onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
          >
            <option value="valide">Valide</option>
            <option value="expire">Expiré</option>
            <option value="en_cours_acquisition">En cours d'acquisition</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'obtention
          </label>
          <input
            type="date"
            value={formData.date_obtention}
            onChange={(e) => setFormData({ ...formData, date_obtention: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'expiration
          </label>
          <input
            type="date"
            value={formData.date_expiration}
            onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={loading || loadingCompetences}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sauvegarde..." : competence ? "Modifier" : "Créer"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

