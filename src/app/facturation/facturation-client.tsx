"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, Download, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { formatCurrency } from "@/utils/format";

interface Affaire {
  id: string;
  numero: string;
  libelle: string;
  type_valorisation: "BPU" | "depense_controlee";
}

interface LigneFacturation {
  id: string;
  affaire_id: string;
  affaire_numero: string;
  ot: string | null;
  tranche: number | null;
  systeme_elementaire: string | null;
  type_activite: string | null;
  type_horaire: string | null;
  poste_bpu_id: string | null;
  heures: number;
  taux_horaire: number;
  coefficient: number;
  montant_calcule: number;
  montant_final: number | null;
  motif_derogation: string | null;
  statut: "a_facturer" | "facture" | "reporte";
  date_saisie: string;
}

interface FacturationClientProps {
  affaires: Affaire[];
  userRoles: string[];
}

export default function FacturationClient({ affaires, userRoles }: FacturationClientProps) {
  const [loading, setLoading] = useState(false);
  const [mois, setMois] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [affaireFiltre, setAffaireFiltre] = useState<string>("");
  const [lignesFacturation, setLignesFacturation] = useState<LigneFacturation[]>([]);
  const [lignesSelectionnees, setLignesSelectionnees] = useState<Set<string>>(new Set());

  const isConducteur = userRoles.includes("Conducteur de travaux");
  const isResponsableAffaire = userRoles.includes("Responsable d'Affaire");
  const isAdmin = userRoles.includes("Administrateur");

  // Charger les lignes de facturation pour le mois sélectionné
  useEffect(() => {
    const chargerLignes = async () => {
      setLoading(true);
      try {
        const [annee, moisNum] = mois.split("-");
        const response = await fetch(
          `/api/facturation/lignes?annee=${annee}&mois=${moisNum}&affaire_id=${affaireFiltre || ""}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setLignesFacturation(data.lignes || []);
        }
      } catch (error) {
        console.error("Erreur chargement lignes facturation:", error);
      } finally {
        setLoading(false);
      }
    };

    chargerLignes();
  }, [mois, affaireFiltre]);

  // Calculer les totaux
  const totaux = useMemo(() => {
    const lignesAFacturer = lignesFacturation.filter(
      (l) => l.statut === "a_facturer" && lignesSelectionnees.has(l.id)
    );
    
    return {
      heures: lignesAFacturer.reduce((sum, l) => sum + l.heures, 0),
      montant: lignesAFacturer.reduce((sum, l) => sum + (l.montant_final || l.montant_calcule), 0),
      nombreLignes: lignesAFacturer.length,
    };
  }, [lignesFacturation, lignesSelectionnees]);

  const handleSelectionLigne = (ligneId: string) => {
    const newSelection = new Set(lignesSelectionnees);
    if (newSelection.has(ligneId)) {
      newSelection.delete(ligneId);
    } else {
      newSelection.add(ligneId);
    }
    setLignesSelectionnees(newSelection);
  };

  const handleSelectionTout = () => {
    const lignesAFacturer = lignesFacturation.filter((l) => l.statut === "a_facturer");
    if (lignesSelectionnees.size === lignesAFacturer.length) {
      setLignesSelectionnees(new Set());
    } else {
      setLignesSelectionnees(new Set(lignesAFacturer.map((l) => l.id)));
    }
  };

  const handleValiderFacturation = async () => {
    if (lignesSelectionnees.size === 0) {
      alert("Veuillez sélectionner au moins une ligne à facturer");
      return;
    }

    if (!confirm(`Valider la facturation de ${lignesSelectionnees.size} ligne(s) ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/facturation/valider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ligne_ids: Array.from(lignesSelectionnees),
        }),
      });

      if (response.ok) {
        alert("Facturation validée avec succès");
        setLignesSelectionnees(new Set());
        // Recharger les lignes
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la validation");
      }
    } catch (error) {
      console.error("Erreur validation facturation:", error);
      alert("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
            Facturation Mensuelle
          </h1>
          <p className="text-base sm:text-lg text-secondary">
            Compilation et validation des lignes de facturation
          </p>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Mois
              </label>
              <input
                type="month"
                value={mois}
                onChange={(e) => setMois(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Affaire
              </label>
              <select
                value={affaireFiltre}
                onChange={(e) => setAffaireFiltre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="">Toutes les affaires</option>
                {affaires.map((affaire) => (
                  <option key={affaire.id} value={affaire.id}>
                    {affaire.numero} - {affaire.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Totaux */}
        {totaux.nombreLignes > 0 && (
          <div className="card mb-6 bg-primary/5 border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Totaux sélectionnés
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Lignes</p>
                    <p className="text-2xl font-bold text-primary">{totaux.nombreLignes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Heures</p>
                    <p className="text-2xl font-bold text-primary">{totaux.heures.toFixed(2)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Montant</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(totaux.montant, 2)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleValiderFacturation}
                disabled={loading || lignesSelectionnees.size === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                Valider la facturation
              </button>
            </div>
          </div>
        )}

        {/* Tableau des lignes */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">
                    <input
                      type="checkbox"
                      checked={
                        lignesFacturation.filter((l) => l.statut === "a_facturer").length > 0 &&
                        lignesFacturation
                          .filter((l) => l.statut === "a_facturer")
                          .every((l) => lignesSelectionnees.has(l.id))
                      }
                      onChange={handleSelectionTout}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="text-left p-3 text-sm font-semibold">Affaire</th>
                  <th className="text-left p-3 text-sm font-semibold">OT</th>
                  <th className="text-left p-3 text-sm font-semibold">Tranche</th>
                  <th className="text-left p-3 text-sm font-semibold">Système</th>
                  <th className="text-left p-3 text-sm font-semibold">Type</th>
                  <th className="text-left p-3 text-sm font-semibold">Type Horaire</th>
                  <th className="text-right p-3 text-sm font-semibold">Heures</th>
                  <th className="text-right p-3 text-sm font-semibold">Taux</th>
                  <th className="text-right p-3 text-sm font-semibold">Coeff.</th>
                  <th className="text-right p-3 text-sm font-semibold">Montant</th>
                  <th className="text-center p-3 text-sm font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="text-center p-8 text-gray-500">
                      Chargement...
                    </td>
                  </tr>
                ) : lignesFacturation.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center p-8 text-gray-500">
                      Aucune ligne de facturation pour cette période
                    </td>
                  </tr>
                ) : (
                  lignesFacturation.map((ligne) => (
                    <tr
                      key={ligne.id}
                      className={`border-b hover:bg-gray-50 ${
                        ligne.statut === "reporte" ? "bg-orange-50" : ""
                      }`}
                    >
                      <td className="p-3">
                        {ligne.statut === "a_facturer" && (
                          <input
                            type="checkbox"
                            checked={lignesSelectionnees.has(ligne.id)}
                            onChange={() => handleSelectionLigne(ligne.id)}
                            className="w-4 h-4"
                          />
                        )}
                      </td>
                      <td className="p-3 text-sm">{ligne.affaire_numero}</td>
                      <td className="p-3 text-sm">{ligne.ot || "-"}</td>
                      <td className="p-3 text-sm">{ligne.tranche ?? "-"}</td>
                      <td className="p-3 text-sm">{ligne.systeme_elementaire || "-"}</td>
                      <td className="p-3 text-sm">{ligne.type_activite || "-"}</td>
                      <td className="p-3 text-sm">{ligne.type_horaire || "-"}</td>
                      <td className="p-3 text-sm text-right">{ligne.heures.toFixed(2)}</td>
                      <td className="p-3 text-sm text-right">{formatCurrency(ligne.taux_horaire, 2)}</td>
                      <td className="p-3 text-sm text-right">×{ligne.coefficient}</td>
                      <td className="p-3 text-sm text-right font-semibold">
                        {formatCurrency(ligne.montant_final || ligne.montant_calcule, 2)}
                      </td>
                      <td className="p-3 text-center">
                        {ligne.statut === "a_facturer" && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            À facturer
                          </span>
                        )}
                        {ligne.statut === "facture" && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            Facturé
                          </span>
                        )}
                        {ligne.statut === "reporte" && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            Reporté
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
      </div>
    </div>
  );
}

