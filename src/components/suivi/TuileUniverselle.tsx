"use client";

import { useState, useEffect, useMemo } from "react";
import { X, CheckCircle, Calendar, Save } from "lucide-react";

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
  onSaisieComplete?: () => void;
}

export default function TuileUniverselle({ collaborateurId, userId, isAdmin = false, onSaisieComplete }: TuileUniverselleProps) {
  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [activites, setActivites] = useState<ActiviteTerrain[]>([]);
  const [motifsReport, setMotifsReport] = useState<MotifReport[]>([]);
  const [saving, setSaving] = useState(false);
  
  // État du formulaire
  const [selectedAffaireId, setSelectedAffaireId] = useState<string>("");
  const [selectedActiviteId, setSelectedActiviteId] = useState<string>("");
  const [nouvelleActivite, setNouvelleActivite] = useState(false);
  
  // Champs activité (préremplis ou à saisir)
  const [libelle, setLibelle] = useState("");
  const [ot, setOt] = useState("");
  const [tranche, setTranche] = useState<number | "">("");
  const [systemeElementaire, setSystemeElementaire] = useState("");
  const [typeActivite, setTypeActivite] = useState("");
  const [typeHoraire, setTypeHoraire] = useState("");
  const [commentaire, setCommentaire] = useState("");
  
  // Statut du jour
  const [statutJour, setStatutJour] = useState<"realise" | "reporte" | "termine" | null>(null);
  const [motifReport, setMotifReport] = useState("");
  const [motifReportId, setMotifReportId] = useState<string>("");
  const [nouveauMotifReport, setNouveauMotifReport] = useState("");
  
  // Mode de l'affaire (BPU ou Dépense Contrôlée)
  const modeAffaire = useMemo(() => {
    const affaire = affaires.find(a => a.id === selectedAffaireId);
    return affaire?.type_valorisation || null;
  }, [affaires, selectedAffaireId]);
  
  // Activités filtrées (seulement Planifiée / Lancée / Reportée)
  const activitesFiltrees = useMemo(() => {
    if (!selectedAffaireId) return [];
    return activites.filter(a => 
      a.affaire_id === selectedAffaireId && 
      ["planifiee", "lancee", "reportee"].includes(a.statut)
    );
  }, [activites, selectedAffaireId]);
  
  // Charger les données au montage
  useEffect(() => {
    fetchAffaires();
    fetchMotifsReport();
  }, []);
  
  // Charger les activités quand une affaire est sélectionnée
  useEffect(() => {
    if (selectedAffaireId) {
      fetchActivites(selectedAffaireId);
    } else {
      setActivites([]);
    }
  }, [selectedAffaireId]);
  
  // Préremplir les champs quand une activité est sélectionnée
  useEffect(() => {
    if (selectedActiviteId && !nouvelleActivite) {
      const activite = activites.find(a => a.id === selectedActiviteId);
      if (activite) {
        setLibelle(activite.libelle || "");
        setOt(activite.ot || "");
        setTranche(activite.tranche ?? "");
        setSystemeElementaire(activite.systeme_elementaire || "");
        setTypeActivite(activite.type_activite || "");
        setTypeHoraire(activite.type_horaire || "");
        setCommentaire(activite.commentaire || "");
        
        // Charger la dernière saisie pour préremplir
        fetchDerniereSaisie(activite.id);
      }
    }
  }, [selectedActiviteId, activites, nouvelleActivite]);
  
  const fetchAffaires = async () => {
    try {
      const response = await fetch("/api/affaires");
      if (response.ok) {
        const data = await response.json();
        setAffaires(data.affaires || []);
      }
    } catch (error) {
      console.error("Erreur chargement affaires:", error);
    }
  };
  
  const fetchActivites = async (affaireId: string) => {
    try {
      const response = await fetch(`/api/activites-terrain?affaire_id=${affaireId}`);
      if (response.ok) {
        const data = await response.json();
        setActivites(data.activites || []);
      }
    } catch (error) {
      console.error("Erreur chargement activités:", error);
    }
  };
  
  const fetchMotifsReport = async () => {
    try {
      const response = await fetch("/api/motifs-report");
      if (response.ok) {
        const data = await response.json();
        // Trier par fréquence décroissante
        const sorted = (data.motifs || []).sort((a: MotifReport, b: MotifReport) => 
          b.frequence_utilisation - a.frequence_utilisation
        );
        setMotifsReport(sorted);
      }
    } catch (error) {
      console.error("Erreur chargement motifs:", error);
    }
  };
  
  const fetchDerniereSaisie = async (activiteId: string) => {
    try {
      const response = await fetch(`/api/saisies-quotidiennes?activite_id=${activiteId}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.saisies && data.saisies.length > 0) {
          // Préremplir avec les valeurs de la dernière saisie
          // (selon PRD : préremplissage depuis dernière saisie)
          // Les valeurs sont déjà préremplies depuis l'activité sélectionnée
        }
      }
    } catch (error) {
      console.error("Erreur chargement dernière saisie:", error);
    }
  };
  
  const handleActiviteChange = (activiteId: string) => {
    if (activiteId === "nouvelle") {
      setNouvelleActivite(true);
      setSelectedActiviteId("");
      // Réinitialiser les champs
      setLibelle("");
      setOt("");
      setTranche("");
      setSystemeElementaire("");
      setTypeActivite("");
      setTypeHoraire("");
      setCommentaire("");
    } else {
      setNouvelleActivite(false);
      setSelectedActiviteId(activiteId);
    }
  };
  
  const handleMotifReportSelect = (motifId: string) => {
    setMotifReportId(motifId);
    const motif = motifsReport.find(m => m.id === motifId);
    if (motif) {
      setMotifReport(motif.libelle);
    }
  };
  
  const handleSubmit = async () => {
    if (!selectedAffaireId) {
      alert("Veuillez sélectionner une affaire");
      return;
    }
    
    if (!libelle.trim()) {
      alert("Le libellé est obligatoire");
      return;
    }
    
    if (!ot.trim()) {
      alert("L'OT (Ordre de Travail) est obligatoire");
      return;
    }
    
    if (!statutJour) {
      alert("Veuillez sélectionner un statut du jour");
      return;
    }
    
    if (statutJour === "reporte" && !motifReport.trim() && !nouveauMotifReport.trim()) {
      alert("Le motif de report est obligatoire");
      return;
    }
    
    setSaving(true);
    try {
      let activiteId = selectedActiviteId;
      
      // Si nouvelle activité, la créer d'abord
      if (nouvelleActivite || !activiteId) {
        const responseActivite = await fetch("/api/activites-terrain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            libelle,
            affaire_id: selectedAffaireId,
            ot,
            tranche: tranche === "" ? null : Number(tranche),
            systeme_elementaire: systemeElementaire || null,
            type_activite: typeActivite || null,
            type_horaire: modeAffaire === "BPU" ? (typeHoraire || null) : null,
            commentaire: commentaire || null,
            a_rattacher: true, // Activité créée à la volée
            statut: "planifiee",
          }),
        });
        
        if (!responseActivite.ok) {
          throw new Error("Erreur lors de la création de l'activité");
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
    setSelectedAffaireId("");
    setSelectedActiviteId("");
    setNouvelleActivite(false);
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
  
  return (
    <div className="card border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-secondary">Tuile Universelle</h3>
          <p className="text-sm text-gray-600">Saisie rapide des activités du jour</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Sélection Affaire */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Affaire <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedAffaireId}
            onChange={(e) => {
              setSelectedAffaireId(e.target.value);
              setSelectedActiviteId("");
              setNouvelleActivite(false);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            <option value="">Sélectionner une affaire</option>
            {affaires.map((affaire) => (
              <option key={affaire.id} value={affaire.id}>
                {affaire.numero} - {affaire.libelle}
              </option>
            ))}
          </select>
          {modeAffaire && (
            <p className="mt-1 text-xs text-gray-500">
              Mode : {modeAffaire === "BPU" ? "BPU (Bordereau Prix Unitaires)" : "Dépense Contrôlée"}
            </p>
          )}
        </div>
        
        {/* Sélection Activité */}
        {selectedAffaireId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activité
            </label>
            <select
              value={nouvelleActivite ? "nouvelle" : selectedActiviteId}
              onChange={(e) => handleActiviteChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
        )}
        
        {/* Champs activité */}
        {selectedAffaireId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Libellé <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                onChange={(e) => setTranche(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
        {selectedAffaireId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire interne
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}
        
        {/* Statut du jour */}
        {selectedAffaireId && libelle && ot && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut du jour <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatutJour("realise");
                  setMotifReport("");
                  setMotifReportId("");
                  setNouveauMotifReport("");
                }}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  statutJour === "realise"
                    ? "bg-green-500 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
                }`}
              >
                <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                Réalisé
              </button>
              
              <button
                type="button"
                onClick={() => setStatutJour("reporte")}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  statutJour === "reporte"
                    ? "bg-orange-500 text-white border-orange-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-orange-500"
                }`}
              >
                <Calendar className="h-5 w-5 mx-auto mb-1" />
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
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  statutJour === "termine"
                    ? "bg-blue-500 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                }`}
              >
                <CheckCircle className="h-5 w-5 mx-auto mb-1" />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}
        
        {/* Boutons d'action */}
        {selectedAffaireId && libelle && ot && statutJour && (
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 btn-primary bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? "Enregistrement..." : "Valider la saisie"}
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="h-5 w-5" />
              Réinitialiser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

