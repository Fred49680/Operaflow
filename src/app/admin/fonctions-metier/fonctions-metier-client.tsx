"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, CheckCircle, AlertTriangle } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase/client";

interface FonctionMetier {
  id: string;
  libelle: string;
  description: string | null;
  is_active: boolean;
  ordre_affichage: number;
  created_at: string;
  updated_at: string;
}

interface FonctionsMetierClientProps {
  fonctions: FonctionMetier[];
}

export default function FonctionsMetierClient({
  fonctions: initialFonctions,
}: FonctionsMetierClientProps) {
  const router = useRouter();
  const [fonctions] = useState(initialFonctions);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFonction, setSelectedFonction] = useState<FonctionMetier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    libelle: string;
    description: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    libelle: "",
    description: "",
  });

  // Ref pour détecter les clics en dehors de la ligne en édition
  const editRowRef = useRef<HTMLTableRowElement | null>(null);

  const handleCreate = async () => {
    if (!formData.libelle.trim()) {
      setError("Le libellé est requis");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();
      const { error: insertError } = await supabase
        .from("tbl_fonctions_metier")
        .insert({
          libelle: formData.libelle.trim(),
          description: formData.description.trim() || null,
          is_active: true,
        });

      if (insertError) throw insertError;

      setSuccess("Fonction métier créée avec succès");
      setModalOpen(false);
      setFormData({
        libelle: "",
        description: "",
      });
      // Refresh immédiat
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValues || !editValues.libelle.trim()) {
      setError("Le libellé est requis");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();
      const { error: updateError } = await supabase
        .from("tbl_fonctions_metier")
        .update({
          libelle: editValues.libelle.trim(),
          description: editValues.description.trim() || null,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setSuccess("Fonction métier modifiée avec succès");
      setEditingId(null);
      setEditValues(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Êtes-vous sûr de vouloir ${currentStatus ? "désactiver" : "activer"} cette fonction métier ?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();
      const { error: updateError } = await supabase
        .from("tbl_fonctions_metier")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (updateError) throw updateError;

      setSuccess(`Fonction métier ${!currentStatus ? "activée" : "désactivée"} avec succès`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  const startEdit = (fonction: FonctionMetier) => {
    setEditingId(fonction.id);
    setEditValues({
      libelle: fonction.libelle,
      description: fonction.description || "",
    });
  };

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues(null);
  }, []);

  // Auto-save : détecter les clics en dehors et la touche Entrée
  useEffect(() => {
    if (!editingId || !editValues) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (editRowRef.current && !editRowRef.current.contains(event.target as Node)) {
        // Cliquer en dehors de la ligne = sauvegarder automatiquement
        handleUpdate(editingId);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleUpdate(editingId);
      } else if (event.key === "Escape") {
        cancelEdit();
      }
    };

    // Attendre un peu avant d'ajouter le listener pour éviter de sauvegarder immédiatement
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingId, editValues, handleUpdate, cancelEdit]);

  return (
    <>
      {/* Messages de succès/erreur */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Bouton Ajouter */}
      <div className="mb-6">
        <button
          onClick={() => {
            setSelectedFonction(null);
            setModalOpen(true);
            setFormData({
              libelle: "",
              description: "",
            });
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Ajouter une fonction métier
        </button>
      </div>

      {/* Tableau */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Libellé
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fonctions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Aucune fonction métier enregistrée
                  </td>
                </tr>
              ) : (
                fonctions.map((fonction) => (
                  <tr 
                    key={fonction.id}
                    ref={editingId === fonction.id ? editRowRef : null}
                    className={`hover:bg-primary/5 transition-colors duration-150 ${editingId === fonction.id ? 'bg-blue-50' : 'cursor-pointer'}`}
                    onClick={(e) => {
                      // Ne pas déclencher si on clique sur le statut ou si on est déjà en édition
                      if (editingId === fonction.id) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('.statut-badge') || target.closest('input') || target.closest('textarea')) {
                        return;
                      }
                      startEdit(fonction);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingId === fonction.id && editValues ? (
                        <input
                          type="text"
                          value={editValues.libelle}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              libelle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      ) : (
                        fonction.libelle
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {editingId === fonction.id && editValues ? (
                        <textarea
                          value={editValues.description}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          rows={2}
                        />
                      ) : (
                        fonction.description || "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === fonction.id ? (
                        <span className="text-xs text-gray-500 italic">
                          Cliquez en dehors ou appuyez sur Entrée pour enregistrer
                        </span>
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(fonction.id, fonction.is_active);
                          }}
                          className={`statut-badge inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all hover:scale-105 ${
                            fonction.is_active
                              ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                              : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"
                          }`}
                          title={`Cliquer pour ${fonction.is_active ? "désactiver" : "activer"}`}
                        >
                          {fonction.is_active ? "Actif" : "Inactif"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-600/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedFonction ? "Modifier la fonction métier" : "Nouvelle fonction métier"}
              </h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedFonction(null);
                  setError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Libellé *
                </label>
                <input
                  type="text"
                  required
                  value={formData.libelle}
                  onChange={(e) =>
                    setFormData({ ...formData, libelle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ex: Conducteur de travaux"
                  autoFocus
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Description optionnelle de la fonction métier"
                />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Création..." : "Créer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedFonction(null);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

