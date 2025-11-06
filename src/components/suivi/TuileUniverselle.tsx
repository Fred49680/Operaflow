"use client";

import { useState, useEffect, useMemo } from "react";
import { X, CheckCircle, Calendar, Save, Play } from "lucide-react";

interface Affaire {
  id: string;
  numero: string;
  libelle: string;
  type_valorisation: "BPU" | "depense_controlee";
}

interface ActiviteTerrain {
  id: string;
  libelle: string;
  affaire_id: string;
  ot?: string | null;
  tranche?: number | null;
  systeme_elementaire?: string | null;
  type_activite?: string | null;
  type_horaire?: string | null;
  commentaire?: string | null;
  statut: "planifiee" | "lancee" | "reportee" | "terminee";
  date_debut?: string | null;
  date_fin?: string | null;
  a_rattacher: boolean;
}

interface MotifReport {
  id: string;
  libelle: string;
  frequence_utilisation: number;
}

interface TuileUniverselleProps {
  collaborateurId: string; // Peut être userId si pas de collaborateur
  userId?: string;
  isAdmin?: boolean;
  userRoles?: string[];
  onSaisieComplete?: () => void;
}

export default function TuileUniverselle({ collaborateurId, userId, isAdmin = false, userRoles = [], onSaisieComplete }: TuileUniverselleProps) {
  // Vérifier si l'utilisateur est Conducteur de travaux
  const isConducteur = userRoles.some((role) => {
    const roleStr = role as string;
    return roleStr === "Conducteur de travaux";
  }) || isAdmin;
  
  // Tous les hooks doivent être appelés avant tout return conditionnel
  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [activites, setActivites] = useState<ActiviteTerrain[]>([]);
  const [motifsReport, setMotifsReport] = useState<MotifReport[]>([]);
  const [saving, setSaving] = useState(false);

  // État du formulaire
  const [selectedActiviteId, setSelectedActiviteId] = useState<string>("");
  const [nouvelleActivite, setNouvelleActivite] = useState(false);
  const [selectedAffaireIdForNew, setSelectedAffaireIdForNew] = useState<string>(""); // Pour nouvelle activité
  // L'affaire sera déterminée automatiquement depuis l'activité sélectionnée, ou depuis selectedAffaireIdForNew si nouvelle
  const selectedAffaireId = useMemo(() => {
    if (nouvelleActivite) {
      return selectedAffaireIdForNew;
    }
    if (selectedActiviteId) {
      const activite = activites.find((a) => a.id === selectedActiviteId);
      return activite?.affaire_id || "";
    }
    return "";
  }, [selectedActiviteId, nouvelleActivite, activites, selectedAffaireIdForNew]);
  const [libelle, setLibelle] = useState("");
  const [ot, setOt] = useState("");
  const [tranche, setTranche] = useState<string>("");
  const [systemeElementaire, setSystemeElementaire] = useState("");
  const [typeActivite, setTypeActivite] = useState("");
  const [typeHoraire, setTypeHoraire] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [statutJour, setStatutJour] = useState<"realise" | "reporte" | "termine" | null>(null);
  const [motifReport, setMotifReport] = useState("");
  const [motifReportId, setMotifReportId] = useState<string>("");
  const [nouveauMotifReport, setNouveauMotifReport] = useState("");

  // Mode de l'affaire (BPU ou Dépense Contrôlée)
  const modeAffaire = useMemo(() => {
    const affaire = affaires.find((a) => a.id === selectedAffaireId);
    return affaire?.type_valorisation || null;
  }, [affaires, selectedAffaireId]);

  // Filtrer les activités selon le statut (toutes les activités disponibles)
  const activitesFiltrees = useMemo(() => {
    return activites.filter(
      (act) =>
        act.statut === "planifiee" || act.statut === "lancee" || act.statut === "reportee"
    );
  }, [activites]);

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les affaires
        const responseAffaires = await fetch("/api/affaires");
        if (responseAffaires.ok) {
          const data = await responseAffaires.json();
          setAffaires(data.affaires || []);
        }

        // Charger les activités terrain
        const responseActivites = await fetch("/api/activites-terrain");
        if (responseActivites.ok) {
          const data = await responseActivites.json();
          setActivites(data.activites || []);
        }

        // Charger les motifs de report
        const responseMotifs = await fetch("/api/motifs-report");
        if (responseMotifs.ok) {
          const data = await responseMotifs.json();
          setMotifsReport(data.motifs || []);
        }

        // Charger la dernière saisie du collaborateur pour préremplir (après avoir chargé les activités)
        if (collaborateurId && activites.length > 0) {
          const responseDerniereSaisie = await fetch(
            `/api/saisies-quotidiennes?collaborateur_id=${collaborateurId}&limit=1`
          );
          if (responseDerniereSaisie.ok) {
            const dataSaisie = await responseDerniereSaisie.json();
            const derniereSaisie = dataSaisie.saisies?.[0];
            
            if (derniereSaisie && derniereSaisie.activite) {
              // Préremplir avec la dernière activité utilisée
              const activiteId = derniereSaisie.activite.id;
              const activite = activites.find((a) => a.id === activiteId);
              
              if (activite) {
                setSelectedActiviteId(activiteId);
                setNouvelleActivite(false);
                // Les autres champs seront préremplis par le useEffect suivant
              }
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement données:", error);
      }
    };

    fetchData();
  }, [collaborateurId]);

  // Préremplir depuis la dernière saisie une fois les activités chargées
  useEffect(() => {
    if (collaborateurId && activites.length > 0 && !selectedActiviteId && !nouvelleActivite) {
      const fetchDerniereSaisie = async () => {
        try {
          const responseDerniereSaisie = await fetch(
            `/api/saisies-quotidiennes?collaborateur_id=${collaborateurId}&limit=1`
          );
          if (responseDerniereSaisie.ok) {
            const dataSaisie = await responseDerniereSaisie.json();
            const derniereSaisie = dataSaisie.saisies?.[0];
            
            if (derniereSaisie && derniereSaisie.activite) {
              const activiteId = derniereSaisie.activite.id;
              const activite = activites.find((a) => a.id === activiteId);
              
              if (activite) {
                setSelectedActiviteId(activiteId);
                setNouvelleActivite(false);
              }
            }
          }
        } catch (error) {
          console.error("Erreur récupération dernière saisie:", error);
        }
      };
      
      fetchDerniereSaisie();
    }
  }, [collaborateurId, activites, selectedActiviteId, nouvelleActivite]);

  // Préremplir les champs si activité sélectionnée
  useEffect(() => {
    if (selectedActiviteId && !nouvelleActivite) {
      const activite = activites.find((a) => a.id === selectedActiviteId);
      if (activite) {
        setLibelle(activite.libelle);
        setOt(activite.ot || "");
        setTranche(activite.tranche?.toString() || "");
        setSystemeElementaire(activite.systeme_elementaire || "");
        setTypeActivite(activite.type_activite || "");
        setTypeHoraire(activite.type_horaire || "");
        setCommentaire(activite.commentaire || "");
      }
    }
  }, [selectedActiviteId, nouvelleActivite, activites]);

  const handleActiviteChange = (value: string) => {
    if (value === "nouvelle") {
      setNouvelleActivite(true);
      setSelectedActiviteId("");
      setSelectedAffaireIdForNew(""); // Réinitialiser l'affaire pour nouvelle activité
      setLibelle("");
      setOt("");
      setTranche("");
      setSystemeElementaire("");
      setTypeActivite("");
      setTypeHoraire("");
      setCommentaire("");
    } else {
      setNouvelleActivite(false);
      setSelectedActiviteId(value);
      setSelectedAffaireIdForNew(""); // Réinitialiser
      // L'affaire sera déterminée automatiquement via le useMemo
    }
  };

  const handleMotifReportSelect = (motifId: string) => {
    const motif = motifsReport.find((m) => m.id === motifId);
    if (motif) {
      setMotifReportId(motifId);
      setMotifReport(motif.libelle);
      setNouveauMotifReport("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedActiviteId && !nouvelleActivite) {
      alert("Veuillez sélectionner ou créer une activité");
      return;
    }
    
    if (!libelle || !ot || !statutJour) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    if (nouvelleActivite && !selectedAffaireId) {
      alert("⚠️ Veuillez assigner une affaire à cette nouvelle activité avant de continuer.");
      return;
    }

    if (statutJour === "reporte" && !motifReport && !nouveauMotifReport) {
      alert("Veuillez saisir un motif de report");
      return;
    }

    setSaving(true);

    try {
      // Créer l'activité si nouvelle
      let activiteId = selectedActiviteId;
      if (nouvelleActivite || !selectedActiviteId) {
        const responseActivite = await fetch("/api/activites-terrain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            libelle,
            affaire_id: selectedAffaireId,
            ot,
            tranche: tranche ? Number(tranche) : null,
            systeme_elementaire: systemeElementaire || null,
            type_activite: typeActivite || null,
            type_horaire: modeAffaire === "BPU" ? (typeHoraire || null) : null,
            commentaire: commentaire || null,
            statut: "planifiee",
            a_rattacher: false,
          }),
        });

        if (!responseActivite.ok) {
          const error = await responseActivite.json();
          throw new Error(error.error || "Erreur lors de la création de l'activité");
        }

        const dataActivite = await responseActivite.json();
        activiteId = dataActivite.activite.id;
      }

      // Créer ou mettre à jour le motif de report si nouveau
      let motifIdFinal = motifReportId;
      if (statutJour === "reporte" && nouveauMotifReport.trim() && !motifReportId) {
        const responseMotif = await fetch("/api/motifs-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            libelle: nouveauMotifReport,
          }),
        });

        if (responseMotif.ok) {
          const dataMotif = await responseMotif.json();
          motifIdFinal = dataMotif.motif.id;
        }
      }

      // Créer la saisie quotidienne
      // L'API créera automatiquement le collaborateur si nécessaire (pour les admins)
      const responseSaisie = await fetch("/api/saisies-quotidiennes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activite_id: activiteId,
          collaborateur_id: collaborateurId || null, // Peut être null pour admin
          user_id: userId, // Passer userId pour création auto si nécessaire
          affaire_id: selectedAffaireId,
          date_saisie: new Date().toISOString().split("T")[0],
          statut_jour: statutJour,
          motif_report: statutJour === "reporte" ? (motifReport || nouveauMotifReport) : null,
          motif_report_id: statutJour === "reporte" ? motifIdFinal : null,
          commentaire: commentaire || null,
        }),
      });

      if (!responseSaisie.ok) {
        const error = await responseSaisie.json();
        throw new Error(error.error || "Erreur lors de la saisie");
      }

      // Incrémenter la fréquence du motif si utilisé
      if (motifIdFinal) {
        await fetch(`/api/motifs-report/${motifIdFinal}/incrementer`, {
          method: "POST",
        });
      }

      // Réinitialiser le formulaire
      resetForm();

      // Appeler le callback
      if (onSaisieComplete) {
        onSaisieComplete();
      }

      alert("Saisie enregistrée avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      alert(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedActiviteId("");
    setNouvelleActivite(false);
    setSelectedAffaireIdForNew("");
    setLibelle("");
    setOt("");
    setTranche("");
    setSystemeElementaire("");
    setTypeActivite("");
    setTypeHoraire("");
    setCommentaire("");
    setStatutJour(null);
    setMotifReport("");
    setMotifReportId("");
    setNouveauMotifReport("");
  };

  // Déterminer la couleur de la barre gauche selon le statut
  const getStatutColor = () => {
    if (!statutJour) return "border-l-blue-400";
    switch (statutJour) {
      case "realise":
        return "border-l-blue-400";
      case "reporte":
        return "border-l-orange-400";
      case "termine":
        return "border-l-green-400";
      default:
        return "border-l-blue-400";
    }
  };

  // Déterminer le badge de statut
  const getStatutBadge = () => {
    if (!statutJour) return null;
    switch (statutJour) {
      case "realise":
        return { label: "Réalisé", color: "bg-blue-100 text-blue-700 border-blue-300" };
      case "reporte":
        return { label: "Reporté", color: "bg-orange-100 text-orange-700 border-orange-300" };
      case "termine":
        return { label: "Terminé", color: "bg-green-100 text-green-700 border-green-300" };
      default:
        return null;
    }
  };

  const statutBadge = getStatutBadge();

  // Ne pas afficher la tuile si pas conducteur (après tous les hooks)
  if (!isConducteur) {
    return null;
  }

  return (
    <div className={`card border-l-4 ${getStatutColor()} hover:shadow-lg transition-shadow mb-6`}>
      {/* En-tête tuile */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Play className="h-5 w-5 text-gray-600" />
            {statutBadge && (
              <span className={`text-xs font-semibold px-2 py-1 rounded border ${statutBadge.color}`}>
                {statutBadge.label}
              </span>
            )}
          </div>
          <h3 className="font-bold text-xl text-gray-800 mb-1">
            Tuile Universelle
          </h3>
        </div>
      </div>

      {/* Informations */}
      <div className="space-y-2 mb-4 text-base text-gray-600">
        {selectedAffaireId && (
          <div>
            <span className="font-medium">Affaire:</span>{" "}
            {affaires.find((a) => a.id === selectedAffaireId)?.numero || "N/A"}
          </div>
        )}
        {selectedActiviteId && !nouvelleActivite && (
          <>
            <div>
              <span className="font-medium">Activité:</span> {libelle}
            </div>
            {ot && (
              <div>
                <span className="font-medium">OT:</span> {ot}
              </div>
            )}
            {tranche && (
              <div>
                <span className="font-medium">Tranche:</span> {tranche}
              </div>
            )}
            {systemeElementaire && (
              <div>
                <span className="font-medium">Système élémentaire:</span> {systemeElementaire}
              </div>
            )}
          </>
        )}
      </div>

      {/* Formulaire */}
      <div className="space-y-4 mb-4">
        {/* Sélection Activité */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Activité <span className="text-red-500">*</span>
          </label>
          <select
            value={nouvelleActivite ? "nouvelle" : selectedActiviteId}
            onChange={(e) => handleActiviteChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            required
          >
            <option value="">Sélectionner une activité existante</option>
            {activitesFiltrees.map((activite) => (
              <option key={activite.id} value={activite.id}>
                {activite.libelle} {activite.statut === "lancee" && "(Lancée)"}
              </option>
            ))}
            <option value="nouvelle">+ Créer une nouvelle activité</option>
          </select>
        </div>

        {/* Sélection Affaire (uniquement pour nouvelle activité) */}
        {nouvelleActivite && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Affaire <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-orange-600 font-semibold">⚠️ Obligatoire pour nouvelle activité</span>
            </label>
            <select
              value={selectedAffaireIdForNew}
              onChange={(e) => setSelectedAffaireIdForNew(e.target.value)}
              className="w-full px-4 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-orange-50"
              required
            >
              <option value="">⚠️ Sélectionner une affaire (obligatoire)</option>
              {affaires.map((affaire) => (
                <option key={affaire.id} value={affaire.id}>
                  {affaire.numero} - {affaire.libelle}
                </option>
              ))}
            </select>
            {!selectedAffaireIdForNew && (
              <p className="mt-1 text-xs text-orange-600 font-medium">
                ⚠️ Vous devez assigner une affaire à cette nouvelle activité avant de continuer.
              </p>
            )}
          </div>
        )}

        {/* Champs activité - Affichés uniquement pour nouvelle activité */}
        {nouvelleActivite && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Libellé <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OT (Ordre de Travail) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ot}
                onChange={(e) => setOt(e.target.value)}
                placeholder="123456-01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tranche (0-9)
              </label>
              <input
                type="number"
                min="0"
                max="9"
                value={tranche}
                onChange={(e) => setTranche(e.target.value === "" ? "" : Number(e.target.value).toString())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Système élémentaire
              </label>
              <input
                type="text"
                value={systemeElementaire}
                onChange={(e) => setSystemeElementaire(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'activité
              </label>
              <input
                type="text"
                value={typeActivite}
                onChange={(e) => setTypeActivite(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            {modeAffaire === "BPU" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type horaire
                </label>
                <select
                  value={typeHoraire}
                  onChange={(e) => setTypeHoraire(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                >
                  <option value="">Sélectionner</option>
                  <option value="jour">Jour (HN)</option>
                  <option value="nuit">Nuit</option>
                  <option value="weekend">Week-end</option>
                  <option value="ferie">Férié</option>
                  <option value="3x8">3×8</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Commentaire */}
        {(selectedActiviteId || nouvelleActivite) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire interne
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        )}

        {/* Statut du jour */}
        {(selectedActiviteId || nouvelleActivite) && libelle && ot && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut du jour <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatutJour("realise");
                  setMotifReport("");
                  setMotifReportId("");
                  setNouveauMotifReport("");
                }}
                className={`text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  statutJour === "realise"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-green-500 hover:bg-green-600 opacity-50"
                }`}
              >
                <Play className="h-4 w-4" />
                Lancer
              </button>

              <button
                type="button"
                onClick={() => setStatutJour("reporte")}
                className={`text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  statutJour === "reporte"
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-orange-500 hover:bg-orange-600 opacity-50"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Reporté
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatutJour("termine");
                  setMotifReport("");
                  setMotifReportId("");
                  setNouveauMotifReport("");
                }}
                className={`text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  statutJour === "termine"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-green-500 hover:bg-green-600 opacity-50"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                Terminé
              </button>
            </div>
          </div>
        )}

        {/* Motif de report (si reporté) */}
        {statutJour === "reporte" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motif de report <span className="text-red-500">*</span>
            </label>

            {/* Liste cliquable des motifs précédents */}
            {motifsReport.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Motifs fréquents :</p>
                <div className="flex flex-wrap gap-2">
                  {motifsReport.slice(0, 5).map((motif) => (
                    <button
                      key={motif.id}
                      type="button"
                      onClick={() => handleMotifReportSelect(motif.id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-all ${
                        motifReportId === motif.id
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-700 border-gray-300 hover:border-primary"
                      }`}
                    >
                      {motif.libelle}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Champ texte libre pour nouveau motif */}
            <input
              type="text"
              value={nouveauMotifReport}
              onChange={(e) => {
                setNouveauMotifReport(e.target.value);
                setMotifReportId("");
                setMotifReport(e.target.value);
              }}
              placeholder="Ou saisir un nouveau motif"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      {(selectedActiviteId || nouvelleActivite) && libelle && ot && statutJour && (
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement..." : "Valider la saisie"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-500 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
