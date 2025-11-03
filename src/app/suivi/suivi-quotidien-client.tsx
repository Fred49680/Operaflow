"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Pause, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  History,
  Search,
  X
} from "lucide-react";
import type { ActivitePlanification } from "@/types/planification";

interface SuiviQuotidienClientProps {
  activites: ActivitePlanification[];
  suivis: Array<{
    id: string;
    activite_id: string;
    collaborateur_id: string;
    date_journee: string;
    heures_reelles: number;
    pourcentage_avancement_journee: number;
    statut: string;
    commentaire?: string | null;
  }>;
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
  userId: string;
  userRoles: string[];
}

export default function SuiviQuotidienClient({
  activites,
  suivis,
  sites,
  userId,
  userRoles,
}: SuiviQuotidienClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [selectedActivite, setSelectedActivite] = useState<ActivitePlanification | null>(null);
  const [showAvancementModal, setShowAvancementModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"lancer" | "reporter" | "suspendre" | "prolonger" | "terminer" | null>(null);
  const [saving, setSaving] = useState(false);

  // Vérifier si l'utilisateur peut lancer/manager les activités
  const isChefChantier = userRoles.some((r) => 
    r === "Chef de Chantier" || 
    r === "Responsable d'Activité" ||
    r === "Chargé d'Affaires"
  );
  const isAdmin = userRoles.some((r) => r === "Administrateur");

  // Filtrer les activités
  const filteredActivites = useMemo(() => {
    return activites.filter((activite) => {
      // Filtre par site
      if (filterSite && activite.affaire?.site_id !== filterSite) return false;
      
      // Filtre par statut
      if (filterStatut && activite.statut !== filterStatut) return false;
      
      // Filtre par recherche
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !activite.libelle.toLowerCase().includes(searchLower) &&
          !activite.affaire?.numero.toLowerCase().includes(searchLower) &&
          !activite.numero_hierarchique?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      
      return true;
    });
  }, [activites, filterSite, filterStatut, searchTerm]);

  // Fonction pour obtenir la couleur du statut (selon design app, pas PRD)
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "planifiee":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "lancee":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "reportee":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "suspendue":
        return "bg-red-100 text-red-700 border-red-300";
      case "prolongee":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "terminee":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // Fonction pour obtenir l'icône du statut
  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case "planifiee":
        return <Clock className="h-5 w-5" />;
      case "lancee":
        return <Play className="h-5 w-5" />;
      case "reportee":
        return <Calendar className="h-5 w-5" />;
      case "suspendue":
        return <Pause className="h-5 w-5" />;
      case "prolongee":
        return <AlertCircle className="h-5 w-5" />;
      case "terminee":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  // Fonction pour obtenir les boutons d'action selon statut
  const getActionButtons = (activite: ActivitePlanification) => {
    const buttons: Array<{ label: string; icon: React.ReactNode; action: string; color: string }> = [];

    if (activite.statut === "planifiee") {
      if (isChefChantier || isAdmin) {
        buttons.push({ label: "Lancer", icon: <Play className="h-4 w-4" />, action: "lancer", color: "bg-green-500 hover:bg-green-600" });
        buttons.push({ label: "Reporter", icon: <Calendar className="h-4 w-4" />, action: "reporter", color: "bg-orange-500 hover:bg-orange-600" });
      }
    } else if (activite.statut === "lancee") {
      if (isChefChantier || isAdmin) {
        buttons.push({ label: "Suspendre", icon: <Pause className="h-4 w-4" />, action: "suspendre", color: "bg-red-500 hover:bg-red-600" });
        buttons.push({ label: "Prolonger", icon: <AlertCircle className="h-4 w-4" />, action: "prolonger", color: "bg-purple-500 hover:bg-purple-600" });
        buttons.push({ label: "Terminer", icon: <CheckCircle className="h-4 w-4" />, action: "terminer", color: "bg-green-500 hover:bg-green-600" });
      }
      buttons.push({ label: "Avancement", icon: <TrendingUp className="h-4 w-4" />, action: "avancement", color: "bg-blue-500 hover:bg-blue-600" });
    }

    return buttons;
  };

  // Handler pour les actions
  const handleAction = async (activite: ActivitePlanification, action: string, motif?: string, dateProlongation?: string) => {
    setSaving(true);
    try {
      let newStatut = activite.statut;
      const updates: Record<string, unknown> = {};

      switch (action) {
        case "lancer":
          newStatut = "lancee";
          updates.date_debut_reelle = new Date().toISOString();
          break;
        case "reporter":
          newStatut = "reportee";
          break;
        case "suspendre":
          newStatut = "suspendue";
          break;
        case "prolonger":
          newStatut = "prolongee";
          if (dateProlongation) {
            updates.date_fin_prevue = dateProlongation;
          }
          break;
        case "terminer":
          newStatut = "terminee";
          updates.date_fin_reelle = new Date().toISOString();
          break;
      }

      updates.statut = newStatut;
      if (motif) {
        updates.commentaire = motif;
      }

      const response = await fetch(`/api/planification/activites/${activite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        router.refresh();
        setShowActionModal(false);
        setActionType(null);
        setSelectedActivite(null);
      } else {
        let errorMessage = "Erreur inconnue";
        let errorDetails = "";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
            errorDetails = error.details || error.hint || error.code || "";
            console.error("Erreur API complète:", error);
          } else {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        alert(`Erreur: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  // Handler pour déclarer avancement
  const handleDeclarerAvancement = async (activiteId: string, pourcentage: number, heuresReelles: number, commentaire?: string) => {
    setSaving(true);
    try {
      const response = await fetch("/api/planification/suivi-quotidien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activite_id: activiteId,
          collaborateur_id: userId,
          date_journee: new Date().toISOString().split("T")[0],
          heures_reelles: heuresReelles,
          pourcentage_avancement_journee: pourcentage,
          commentaire: commentaire || null,
        }),
      });

      if (response.ok) {
        router.refresh();
        setShowAvancementModal(false);
      } else {
        let errorMessage = "Erreur inconnue";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          } else {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
        } catch (e) {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        alert(`Erreur: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
            Suivi des Activités Terrain
          </h1>
          <p className="text-base sm:text-lg text-secondary">
            Interface de pilotage visuel et déclaration d'avancement quotidien
          </p>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-gray-400" />
                <label className="block text-xs font-medium text-gray-700">Recherche</label>
              </div>
              <input
                type="text"
                placeholder="Rechercher par activité, numéro, affaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Site</label>
              <select
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous les sites</option>
                {sites.map((site) => (
                  <option key={site.site_id} value={site.site_id}>
                    {site.site_code} - {site.site_label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous les statuts</option>
                <option value="planifiee">Planifiée</option>
                <option value="lancee">Lancée</option>
                <option value="suspendue">Suspendue</option>
                <option value="reportee">Reportée</option>
                <option value="prolongee">Prolongée</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tuiles d'activités */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivites.map((activite) => {
            const statutColor = getStatutColor(activite.statut);
            const statutIcon = getStatutIcon(activite.statut);
            const actionButtons = getActionButtons(activite);

            return (
              <div
                key={activite.id}
                className={`card border-l-4 ${statutColor.split(" ")[2]} hover:shadow-lg transition-shadow`}
              >
                {/* En-tête tuile */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {statutIcon}
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${statutColor}`}>
                        {activite.statut === "planifiee" ? "En attente" :
                         activite.statut === "lancee" ? "En cours" :
                         activite.statut === "reportee" ? "Reportée" :
                         activite.statut === "suspendue" ? "Suspendue" :
                         activite.statut === "prolongee" ? "Prolongée" :
                         activite.statut}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {activite.numero_hierarchique && (
                        <span className="text-primary mr-2">{activite.numero_hierarchique}</span>
                      )}
                      {activite.libelle}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedActivite(activite);
                      setShowHistoriqueModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Historique"
                  >
                    <History className="h-5 w-5" />
                  </button>
                </div>

                {/* Informations */}
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {activite.affaire && (
                    <div>
                      <span className="font-medium">Affaire:</span> {activite.affaire.numero}
                    </div>
                  )}
                  {activite.site && (
                    <div>
                      <span className="font-medium">Site:</span> {activite.site.site_code}
                    </div>
                  )}
                  {activite.responsable && (
                    <div>
                      <span className="font-medium">Responsable:</span> {activite.responsable.prenom} {activite.responsable.nom}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Période:</span>{" "}
                    {new Date(activite.date_debut_prevue).toLocaleDateString("fr-FR")} -{" "}
                    {new Date(activite.date_fin_prevue).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Avancement:</span>
                      <span className="font-bold text-primary">{activite.pourcentage_avancement || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(activite.pourcentage_avancement || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {actionButtons.map((btn) => (
                    <button
                      key={btn.action}
                      onClick={() => {
                        if (btn.action === "avancement") {
                          setSelectedActivite(activite);
                          setShowAvancementModal(true);
                        } else {
                          setSelectedActivite(activite);
                          setActionType(btn.action as any);
                          setShowActionModal(true);
                        }
                      }}
                      className={`${btn.color} text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors`}
                    >
                      {btn.icon}
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredActivites.length === 0 && (
          <div className="card text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune activité trouvée avec les filtres sélectionnés</p>
          </div>
        )}

        {/* Modal Déclarer avancement */}
        {showAvancementModal && selectedActivite && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-primary">Déclarer avancement</h2>
                <button
                  onClick={() => {
                    setShowAvancementModal(false);
                    setSelectedActivite(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                className="p-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const pourcentage = parseFloat(formData.get("pourcentage") as string);
                  const heures = parseFloat(formData.get("heures") as string);
                  const commentaire = formData.get("commentaire") as string;
                  handleDeclarerAvancement(selectedActivite.id, pourcentage, heures, commentaire);
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pourcentage d'avancement (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="pourcentage"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heures réelles <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="heures"
                    min="0"
                    step="0.5"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaire
                  </label>
                  <textarea
                    name="commentaire"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAvancementModal(false);
                      setSelectedActivite(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                    disabled={saving}
                  >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Actions (Lancer, Reporter, Suspendre, Prolonger, Terminer) - Design amélioré */}
        {showActionModal && selectedActivite && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => {
            setShowActionModal(false);
            setSelectedActivite(null);
            setActionType(null);
          }}>
            {/* Overlay avec backdrop blur */}
            <div className="absolute inset-0 bg-slate-600/40 backdrop-blur-sm" />
            
            {/* Modal */}
            <div
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full z-50 border border-gray-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec gradient selon l'action */}
              <div className={`flex items-center gap-4 px-6 py-5 border-b ${
                actionType === "lancer" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100" :
                actionType === "reporter" ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100" :
                actionType === "suspendre" ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-100" :
                actionType === "prolonger" ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100" :
                "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-100"
              }`}>
                {/* Icône de l'action */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  actionType === "lancer" ? "bg-green-100 text-green-600" :
                  actionType === "reporter" ? "bg-orange-100 text-orange-600" :
                  actionType === "suspendre" ? "bg-red-100 text-red-600" :
                  actionType === "prolonger" ? "bg-blue-100 text-blue-600" :
                  "bg-purple-100 text-purple-600"
                }`}>
                  {actionType === "lancer" && <Play className="h-6 w-6" />}
                  {actionType === "reporter" && <Calendar className="h-6 w-6" />}
                  {actionType === "suspendre" && <Pause className="h-6 w-6" />}
                  {actionType === "prolonger" && <Clock className="h-6 w-6" />}
                  {actionType === "terminer" && <CheckCircle className="h-6 w-6" />}
                </div>
                
                {/* Titre */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                    {actionType === "lancer" && "Lancer l'activité"}
                    {actionType === "reporter" && "Reporter l'activité"}
                    {actionType === "suspendre" && "Suspendre l'activité"}
                    {actionType === "prolonger" && "Prolonger l'activité"}
                    {actionType === "terminer" && "Terminer l'activité"}
                  </h2>
                  <p className="text-sm text-gray-600 truncate">
                    {selectedActivite.libelle}
                  </p>
                </div>
                
                {/* Bouton fermer */}
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setSelectedActivite(null);
                    setActionType(null);
                  }}
                  className="flex-shrink-0 p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              {/* Contenu */}
              <form
                className="p-6 space-y-5 bg-gray-50/30"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const motif = formData.get("motif") as string;
                  const dateProlongation = actionType === "prolonger" ? (formData.get("date_prolongation") as string) : undefined;
                  
                  if ((actionType === "reporter" || actionType === "suspendre" || actionType === "prolonger") && !motif) {
                    alert("Le motif est obligatoire pour cette action");
                    return;
                  }

                  handleAction(selectedActivite, actionType, motif, dateProlongation);
                }}
              >
                {/* Informations de l'activité */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">Activité sélectionnée</p>
                      <p className="text-sm text-gray-600 break-words">
                        {selectedActivite.libelle}
                      </p>
                      {selectedActivite.affaire && (
                        <p className="text-xs text-gray-500 mt-1">
                          Affaire: {typeof selectedActivite.affaire === 'object' 
                            ? `${selectedActivite.affaire.numero} - ${selectedActivite.affaire.libelle}`
                            : selectedActivite.affaire}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Champ motif (si requis) */}
                {(actionType === "reporter" || actionType === "suspendre" || actionType === "prolonger") && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Motif <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="motif"
                      rows={4}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                      placeholder="Expliquez la raison du report, de la suspension ou de la prolongation..."
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Ce motif sera visible dans l'historique de l'activité.
                    </p>
                  </div>
                )}

                {/* Champ date prolongation */}
                {actionType === "prolonger" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Clock className="h-4 w-4 inline mr-1.5" />
                      Nouvelle date de fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_prolongation"
                      required
                      min={new Date(selectedActivite.date_fin_prevue).toISOString().split("T")[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Date actuelle de fin: {new Date(selectedActivite.date_fin_prevue).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}

                {/* Message de confirmation pour "lancer" et "terminer" */}
                {(actionType === "lancer" || actionType === "terminer") && (
                  <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                    actionType === "lancer" 
                      ? "bg-green-50 border-green-200 text-green-800" 
                      : "bg-purple-50 border-purple-200 text-purple-800"
                  }`}>
                    <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      actionType === "lancer" ? "text-green-600" : "text-purple-600"
                    }`} />
                    <p className="text-sm font-medium">
                      {actionType === "lancer" 
                        ? "Cette action va changer le statut de l'activité en 'Lancée' et activer le suivi quotidien." 
                        : "Cette action va finaliser l'activité. Assurez-vous que tous les éléments sont terminés."}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionModal(false);
                      setSelectedActivite(null);
                      setActionType(null);
                    }}
                    className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      actionType === "lancer" ? "bg-green-600 hover:bg-green-700 shadow-sm hover:shadow-md" :
                      actionType === "reporter" ? "bg-orange-600 hover:bg-orange-700 shadow-sm hover:shadow-md" :
                      actionType === "suspendre" ? "bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md" :
                      actionType === "prolonger" ? "bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md" :
                      "bg-purple-600 hover:bg-purple-700 shadow-sm hover:shadow-md"
                    }`}
                    disabled={saving}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enregistrement...
                      </span>
                    ) : (
                      "Confirmer"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Historique */}
        {showHistoriqueModal && selectedActivite && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-primary">Historique de l'activité</h2>
                <button
                  onClick={() => {
                    setShowHistoriqueModal(false);
                    setSelectedActivite(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg mb-2">{selectedActivite.libelle}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Affaire:</span> {selectedActivite.affaire?.numero}</p>
                    <p><span className="font-medium">Statut actuel:</span> {selectedActivite.statut}</p>
                    <p><span className="font-medium">Avancement:</span> {selectedActivite.pourcentage_avancement || 0}%</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Déclarations d'avancement</h4>
                  {suivis.filter((s) => s.activite_id === selectedActivite.id).length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune déclaration enregistrée</p>
                  ) : (
                    <div className="space-y-3">
                      {suivis
                        .filter((s) => s.activite_id === selectedActivite.id)
                        .map((suivi) => (
                          <div key={suivi.id} className="border-l-2 border-primary pl-4 py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {new Date(suivi.date_journee).toLocaleDateString("fr-FR")}
                              </span>
                              <span className="text-sm text-gray-600">
                                {suivi.heures_reelles}h - {suivi.pourcentage_avancement_journee}%
                              </span>
                            </div>
                            {suivi.commentaire && (
                              <p className="text-sm text-gray-600 mt-1">{suivi.commentaire}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

