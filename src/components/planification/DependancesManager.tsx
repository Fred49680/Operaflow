"use client";

import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";

interface Dependance {
  id?: string;
  activite_precedente_id: string;
  type_dependance: "FS" | "SS" | "FF" | "SF";
  delai_jours?: number;
  activite_precedente?: {
    id: string;
    libelle: string;
    numero_hierarchique?: string;
  };
}

interface DependancesManagerProps {
  activiteId?: string;
  activitesDisponibles: Array<{
    id: string;
    libelle: string;
    numero_hierarchique?: string;
  }>;
  dependancesInitiales?: Dependance[];
  onChange?: (dependances: Dependance[]) => void;
}

export default function DependancesManager({
  activiteId,
  activitesDisponibles,
  dependancesInitiales = [],
  onChange,
}: DependancesManagerProps) {
  const [dependances, setDependances] = useState<Dependance[]>(dependancesInitiales);
  const [loading, setLoading] = useState(false);

  // Charger les dépendances existantes si on a un ID d'activité
  useEffect(() => {
    if (activiteId) {
      loadDependances();
    }
  }, [activiteId]);

  const loadDependances = async () => {
    if (!activiteId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/planification/dependances?activite_id=${activiteId}`);
      if (response.ok) {
        const data = await response.json();
        setDependances(data.dependances || []);
        onChange?.(data.dependances || []);
      }
    } catch (error) {
      console.error("Erreur chargement dépendances:", error);
    } finally {
      setLoading(false);
    }
  };

  const ajouterDependance = () => {
    const nouvelleDependance: Dependance = {
      activite_precedente_id: "",
      type_dependance: "FS",
      delai_jours: 0,
    };
    setDependances([...dependances, nouvelleDependance]);
  };

  const supprimerDependance = async (index: number, dependanceId?: string) => {
    if (dependanceId && activiteId) {
      // Supprimer depuis l'API
      try {
        const response = await fetch(
          `/api/planification/dependances?id=${dependanceId}&activite_id=${activiteId}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          alert("Erreur lors de la suppression de la dépendance");
          return;
        }
      } catch (error) {
        console.error("Erreur suppression dépendance:", error);
        alert("Erreur lors de la suppression");
        return;
      }
    }
    
    const nouvellesDependances = dependances.filter((_, i) => i !== index);
    setDependances(nouvellesDependances);
    onChange?.(nouvellesDependances);
  };

  const modifierDependance = (index: number, champ: keyof Dependance, valeur: string | number) => {
    const nouvellesDependances = [...dependances];
    nouvellesDependances[index] = {
      ...nouvellesDependances[index],
      [champ]: valeur,
    };
    setDependances(nouvellesDependances);
    onChange?.(nouvellesDependances);
    
    // Si pas d'activiteId (création), ne pas sauvegarder immédiatement
    if (!activiteId) {
      return;
    }
  };

  const sauvegarderDependance = async (index: number, dependance: Dependance) => {
    if (!activiteId || !dependance.activite_precedente_id || !dependance.type_dependance) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    // Si c'est une nouvelle dépendance (sans ID), la créer
    if (!dependance.id) {
      try {
        const response = await fetch("/api/planification/dependances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activite_id: activiteId,
            activite_precedente_id: dependance.activite_precedente_id,
            type_dependance: dependance.type_dependance,
            delai_jours: dependance.delai_jours || 0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const nouvellesDependances = [...dependances];
          nouvellesDependances[index] = data.dependance;
          setDependances(nouvellesDependances);
          onChange?.(nouvellesDependances);
        } else {
          const error = await response.json();
          alert(`Erreur: ${error.error || "Erreur inconnue"}`);
        }
      } catch (error) {
        console.error("Erreur création dépendance:", error);
        alert("Erreur lors de la création");
      }
    }
  };

  const getTypeDependanceLabel = (type: string) => {
    const labels: Record<string, string> = {
      FS: "Fin → Début (FS)",
      SS: "Début → Début (SS)",
      FF: "Fin → Fin (FF)",
      SF: "Début → Fin (SF)",
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement des dépendances...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">Dépendances multiples</h4>
        <button
          type="button"
          onClick={ajouterDependance}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" />
          Ajouter
        </button>
      </div>

      {dependances.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Aucune dépendance définie</p>
      ) : (
        <div className="space-y-2">
          {dependances.map((dependance, index) => (
            <div
              key={dependance.id || index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
            >
              <select
                value={dependance.activite_precedente_id}
                onChange={(e) => {
                  modifierDependance(index, "activite_precedente_id", e.target.value);
                  if (e.target.value && activiteId) {
                    sauvegarderDependance(index, {
                      ...dependance,
                      activite_precedente_id: e.target.value,
                    });
                  }
                }}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Sélectionner une activité</option>
                {activitesDisponibles.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.numero_hierarchique || "•"} {act.libelle}
                  </option>
                ))}
              </select>

              <select
                value={dependance.type_dependance}
                onChange={(e) => {
                  modifierDependance(index, "type_dependance", e.target.value as "FS" | "SS" | "FF" | "SF");
                  if (activiteId) {
                    sauvegarderDependance(index, {
                      ...dependance,
                      type_dependance: e.target.value as "FS" | "SS" | "FF" | "SF",
                    });
                  }
                }}
                className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                title={getTypeDependanceLabel(dependance.type_dependance)}
              >
                <option value="FS">FS</option>
                <option value="SS">SS</option>
                <option value="FF">FF</option>
                <option value="SF">SF</option>
              </select>

              <input
                type="number"
                min="0"
                value={dependance.delai_jours || 0}
                onChange={(e) => {
                  modifierDependance(index, "delai_jours", parseInt(e.target.value) || 0);
                }}
                onBlur={() => {
                  if (activiteId) {
                    sauvegarderDependance(index, dependance);
                  }
                }}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Délai"
                title="Délai en jours"
              />

              <button
                type="button"
                onClick={() => supprimerDependance(index, dependance.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Supprimer cette dépendance"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Les dates seront recalculées automatiquement selon les dépendances.
      </p>
    </div>
  );
}

