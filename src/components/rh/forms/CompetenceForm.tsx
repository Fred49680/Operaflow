"use client";

import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCompetence, setShowNewCompetence] = useState(false);
  const [newCompetence, setNewCompetence] = useState({
    libelle: "",
    code: "",
    categorie: "",
  });
  const [formData, setFormData] = useState({
    competence_id: competence?.competence_id || "",
    niveau: competence?.niveau || "base",
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

  const competencesFiltrees = competencesDisponibles.filter((comp) =>
    comp.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (comp.code && comp.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (comp.categorie && comp.categorie.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateCompetence = async () => {
    if (!newCompetence.libelle.trim()) {
      setError("Le libellé est requis");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/rh/competences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libelle: newCompetence.libelle.trim(),
          code: newCompetence.code.trim() || null,
          categorie: newCompetence.categorie.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Si la compétence existe déjà, on l'utilise
        if (errorData.competence) {
          setFormData({ ...formData, competence_id: errorData.competence.id });
          setShowNewCompetence(false);
          setNewCompetence({ libelle: "", code: "", categorie: "" });
          setError(null);
          setLoading(false);
          // Recharger la liste des compétences
          const refreshResponse = await fetch("/api/rh/competences");
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            setCompetencesDisponibles(refreshData.competences || []);
          }
          return;
        }
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      const created = await response.json();
      setFormData({ ...formData, competence_id: created.id });
      setShowNewCompetence(false);
      setNewCompetence({ libelle: "", code: "", categorie: "" });
      setError(null);
      setCompetencesDisponibles([...competencesDisponibles, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.competence_id) {
      setError("Veuillez sélectionner ou créer une compétence");
      setLoading(false);
      return;
    }

    try {
      const data = {
        collaborateur_id: collaborateurId,
        competence_id: formData.competence_id,
        niveau: formData.niveau,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg text-sm">
          {error}
        </div>
      )}

      {/* Section Compétences */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-700">
            Compétence *
          </label>
          <button
            type="button"
            onClick={() => {
              setShowNewCompetence(!showNewCompetence);
              setSearchTerm("");
            }}
            className="text-sm text-primary hover:text-primary-dark flex items-center gap-1 font-medium"
          >
            <Plus className="h-4 w-4" />
            {showNewCompetence ? "Sélectionner" : "Nouvelle compétence"}
          </button>
        </div>

        {showNewCompetence ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Libellé *
              </label>
              <input
                type="text"
                required
                value={newCompetence.libelle}
                onChange={(e) => setNewCompetence({ ...newCompetence, libelle: e.target.value })}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
                placeholder="Ex: Soudure TIG"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={newCompetence.code}
                  onChange={(e) => setNewCompetence({ ...newCompetence, code: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
                  placeholder="Ex: SOU-TIG"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={newCompetence.categorie}
                  onChange={(e) => setNewCompetence({ ...newCompetence, categorie: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
                  placeholder="Ex: Technique"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateCompetence}
              disabled={loading || !newCompetence.libelle.trim()}
              className="w-full btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Créer la compétence"}
            </button>
          </div>
        ) : (
          <>
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une compétence..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
              />
            </div>

            {/* Liste des compétences en boutons */}
            {loadingCompetences ? (
              <div className="text-center py-8 text-gray-500">
                Chargement des compétences...
              </div>
            ) : competencesFiltrees.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
                {searchTerm ? "Aucune compétence trouvée" : "Aucune compétence disponible"}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                {competencesFiltrees.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, competence_id: comp.id })}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      formData.competence_id === comp.id
                        ? "bg-primary text-white shadow-md"
                        : "bg-white hover:bg-gray-100 border border-gray-200 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {comp.code && <span className="opacity-80">{comp.code} - </span>}
                          {comp.libelle}
                        </div>
                        {comp.categorie && (
                          <div className={`text-xs mt-1 ${formData.competence_id === comp.id ? "text-white/80" : "text-gray-500"}`}>
                            {comp.categorie}
                          </div>
                        )}
                      </div>
                      {formData.competence_id === comp.id && (
                        <div className="ml-2">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Niveau et Statut */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Niveau *
          </label>
          <div className="flex gap-2">
            {["base", "intermediaire", "expert"].map((niv) => (
              <button
                key={niv}
                type="button"
                onClick={() => setFormData({ ...formData, niveau: niv })}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  formData.niveau === niv
                    ? "bg-primary text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {niv === "base" ? "Base" : niv === "intermediaire" ? "Intermédiaire" : "Expert"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Statut *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {["valide", "expire", "en_cours_acquisition", "suspendu"].map((stat) => (
              <button
                key={stat}
                type="button"
                onClick={() => setFormData({ ...formData, statut: stat })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  formData.statut === stat
                    ? "bg-primary text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {stat === "valide" ? "Valide" : 
                 stat === "expire" ? "Expiré" : 
                 stat === "en_cours_acquisition" ? "En cours" : "Suspendu"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || loadingCompetences || !formData.competence_id}
          className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading ? "Sauvegarde..." : competence ? "Modifier" : "Créer"}
        </button>
      </div>
    </form>
  );
}
