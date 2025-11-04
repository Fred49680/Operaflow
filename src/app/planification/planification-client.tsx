"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Search, Plus, AlertTriangle, X, FileText } from "lucide-react";
import GanttTimeline from "@/components/planification/gantt/GanttTimeline";
import AffairesEnAttente from "@/components/planification/AffairesEnAttente";
import AffairesPlanifiees from "@/components/planification/AffairesPlanifiees";
import TemplateSelectorModal from "@/components/planification/TemplateSelectorModal";
import GestionTemplatesModal from "@/components/planification/GestionTemplatesModal";
import DependancesManager from "@/components/planification/DependancesManager";
import type { ActivitePlanification, AffectationPlanification } from "@/types/planification";

interface JalonGantt {
  id: string;
  affaire_id: string;
  numero_lot: string;
  libelle_lot: string;
  date_debut_previsionnelle?: string | null;
  date_fin_previsionnelle?: string | null;
  statut?: string | null;
  affaire?: {
    id: string;
    numero: string;
    libelle: string;
    charge_affaires_id?: string | null;
  } | null;
}

interface PlanificationClientProps {
  activites: ActivitePlanification[];
  affectations: AffectationPlanification[];
  jalons?: JalonGantt[];
  sites?: Array<{ site_id: string; site_code: string; site_label: string }>;
  affaires?: Array<{ id: string; numero: string; libelle: string; statut: string; site_id?: string | null }>;
  collaborateurs?: Array<{ id: string; nom: string; prenom: string }>;
  calendriers?: Array<{ id: string; libelle: string; site_id: string | null; actif: boolean }>;
  isPlanificateur?: boolean;
  userId?: string;
}

export default function PlanificationClient({
  activites: activitesInitiales,
  affectations: _affectations,
  jalons = [],
  sites = [],
  affaires = [],
  collaborateurs: _collaborateurs = [],
  calendriers = [],
  isPlanificateur = false,
  userId,
}: PlanificationClientProps) {
  // Suppression des avertissements pour variables préfixées avec _
  void _collaborateurs;
  void _affectations;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // État local des activités pour mise à jour optimiste
  const [activites, setActivites] = useState<ActivitePlanification[]>(activitesInitiales);
  
  // État local des jalons pour mise à jour optimiste
  const [jalonsLocaux, setJalonsLocaux] = useState(jalons);
  
  // État pour le debounce de sauvegarde automatique
  const [pendingSaves, setPendingSaves] = useState<Map<string, { date_debut_prevue: string; date_fin_prevue: string; duree_jours_ouvres?: number }>>(new Map());
  const [pendingJalonsSaves, setPendingJalonsSaves] = useState<Map<string, { date_debut_previsionnelle: string; date_fin_previsionnelle: string }>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeView, setActiveView] = useState<"gantt" | "alertes">("gantt");
  const [vueGantt, setVueGantt] = useState<"jour" | "semaine" | "mois">("semaine");
  const [filters, setFilters] = useState({
    site: "",
    affaire: "",
    responsable: "",
    statut: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showActiviteModal, setShowActiviteModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGestionTemplatesModal, setShowGestionTemplatesModal] = useState(false);
  const [editingActivite, setEditingActivite] = useState<ActivitePlanification | null>(null);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; nom_template: string; description?: string }>>([]);
  const [calculAutoDateFin, setCalculAutoDateFin] = useState(false);
  const [dateDebut, setDateDebut] = useState("");
  const [dureeJoursOuvres, setDureeJoursOuvres] = useState("");
  const [dateFinCalculee, setDateFinCalculee] = useState("");
  const [statutActivite, setStatutActivite] = useState<string>("planifiee");
  const [motifReport, setMotifReport] = useState<string>("");
  const [selectedAffaireId, setSelectedAffaireId] = useState<string>("");
  const [selectedAffaireGantt, setSelectedAffaireGantt] = useState<string | null>(null);
  const [dependancesEnAttente, setDependancesEnAttente] = useState<Array<{
    activite_precedente_id: string;
    type_dependance: "FS" | "SS" | "FF" | "SF";
    delai_jours?: number;
  }>>([]);
  const [uniteDuree, setUniteDuree] = useState<"jours" | "semaines">("jours");
  const [typeHoraireSelectionne, setTypeHoraireSelectionne] = useState<string>("jour");
  const [selectedCalendrierId, setSelectedCalendrierId] = useState<string>("");
  const [heuresPrevuesAuto, setHeuresPrevuesAuto] = useState<number | null>(null);
  
  // Initialiser selectedAffaireGantt depuis l'URL si présent
  useEffect(() => {
    const affaireId = searchParams.get("affaire");
    const activiteId = searchParams.get("activite");
    
    // Restaurer depuis sessionStorage si pas dans URL
    if (!affaireId) {
      const savedAffaire = sessionStorage.getItem('selectedAffaireGantt');
      if (savedAffaire) {
        setSelectedAffaireGantt(savedAffaire);
        // Nettoyer après utilisation
        sessionStorage.removeItem('selectedAffaireGantt');
      }
    } else {
      setSelectedAffaireGantt(affaireId);
    }
    
    if (activiteId) {
      // Trouver l'activité et ouvrir le modal d'édition
      const activite = activites.find(a => a.id === activiteId);
      if (activite) {
        setEditingActivite(activite);
        setShowActiviteModal(true);
        setSelectedAffaireGantt(activite.affaire_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Charger les templates au montage
  useEffect(() => {
    fetch("/api/planification/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch((err) => console.error("Erreur chargement templates:", err));
  }, []);

  // Réinitialiser les états quand on ouvre/ferme la modal
  useEffect(() => {
    if (showActiviteModal && editingActivite) {
      const initCalculAuto = editingActivite.calcul_auto_date_fin || false;
      const initDateDebut = editingActivite.date_debut_prevue ? new Date(editingActivite.date_debut_prevue).toISOString().slice(0, 16) : "";
      const initDuree = editingActivite.duree_jours_ouvres?.toString() || "";
      
      setDateDebut(initDateDebut);
      setDureeJoursOuvres(initDuree);
      setCalculAutoDateFin(initCalculAuto);
      setStatutActivite(editingActivite.statut || "planifiee");
      setMotifReport("");
      
      if (initCalculAuto && initDateDebut && initDuree) {
        calculerDateFin(initDateDebut, parseInt(initDuree), "jours", editingActivite.type_horaire || "jour");
      } else {
        setDateFinCalculee("");
      }
      setTypeHoraireSelectionne(editingActivite.type_horaire || "jour");
    } else if (showActiviteModal && !editingActivite) {
      // Nouvelle activité
      setDateDebut("");
      setDureeJoursOuvres("");
      setCalculAutoDateFin(false);
      setDateFinCalculee("");
      setUniteDuree("jours");
      setTypeHoraireSelectionne("jour");
      setStatutActivite("planifiee");
      setMotifReport("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showActiviteModal, editingActivite]);

  // Synchroniser les jalons avec les props initiales et mettre à jour à l'ouverture
  useEffect(() => {
    setJalonsLocaux(jalons);
    // Mettre à jour les jalons après synchronisation si le Gantt est ouvert
    if (activeView === "gantt") {
      setTimeout(() => {
        const updatesJalons = mettreAJourJalons();
        
        // Mettre à jour les jalons dans l'état local
        setJalonsLocaux(prev => prev.map(jalon => {
          const update = updatesJalons.get(jalon.id);
          if (update) {
            return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
          }
          return jalon;
        }));
        
        // Sauvegarder les jalons mis à jour
        if (updatesJalons.size > 0) {
          setPendingJalonsSaves(prev => {
            const newMap = new Map(prev);
            updatesJalons.forEach((update, jalonId) => {
              newMap.set(jalonId, update);
            });
            return newMap;
          });
          
          // Déclencher la sauvegarde après un court délai
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            savePendingChanges();
          }, 1000);
        }
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jalons, activeView]);

  // Mettre à jour les jalons à la fermeture du Gantt
  useEffect(() => {
    if (activeView === "alertes") {
      // Mettre à jour les jalons avant de fermer
      const updatesJalons = mettreAJourJalons();
      
      if (updatesJalons.size > 0) {
        // Mettre à jour les jalons dans l'état local
        setJalonsLocaux(prev => prev.map(jalon => {
          const update = updatesJalons.get(jalon.id);
          if (update) {
            return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
          }
          return jalon;
        }));
        
        // Sauvegarder immédiatement les jalons
        setPendingJalonsSaves(prev => {
          const newMap = new Map(prev);
          updatesJalons.forEach((update, jalonId) => {
            newMap.set(jalonId, update);
          });
          return newMap;
        });
        
        // Sauvegarder immédiatement
        savePendingChanges();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  // Filtrage des activités
  const filteredActivites = useMemo(() => {
    const result = activites.filter((activite) => {
      // Si une affaire est sélectionnée pour le Gantt, filtrer uniquement cette affaire
      if (selectedAffaireGantt && activite.affaire_id !== selectedAffaireGantt) return false;
      
      // Filtrer par site via l'affaire (le site est lié à l'affaire)
      if (filters.site && activite.affaire?.site_id && activite.affaire.site_id !== filters.site) return false;
      if (filters.affaire && activite.affaire_id !== filters.affaire) return false;
      if (filters.responsable && activite.responsable_id !== filters.responsable) return false;
      if (filters.statut && activite.statut !== filters.statut) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !activite.libelle.toLowerCase().includes(searchLower) &&
          !activite.numero_activite?.toLowerCase().includes(searchLower) &&
          !activite.affaire?.numero.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
    
    // Debug: Log pour diagnostiquer le problème
    if (process.env.NODE_ENV === 'development') {
      console.log('[Planification Client]', {
        totalActivites: activites.length,
        filteredActivites: result.length,
        selectedAffaireGantt,
        filters,
        searchTerm,
        activitesAvecDates: result.filter(a => a.date_debut_prevue && a.date_fin_prevue).length
      });
    }
    
    return result;
  }, [activites, filters, searchTerm, selectedAffaireGantt]);

  // Filtrer les jalons selon l'affaire sélectionnée
  const filteredJalons = useMemo(() => {
    if (selectedAffaireGantt) {
      return jalonsLocaux.filter(j => j.affaire_id === selectedAffaireGantt);
    }
    // Si aucune affaire sélectionnée, afficher tous les jalons des affaires avec activités
    const affairesAvecActivites = new Set(filteredActivites.map(a => a.affaire_id));
    return jalonsLocaux.filter(j => affairesAvecActivites.has(j.affaire_id));
  }, [jalonsLocaux, selectedAffaireGantt, filteredActivites]);

  // Fonction pour ouvrir le modal de création
  const handleCreateActivite = () => {
    setEditingActivite(null);
    // Proposer d'abord le choix du template
    setShowTemplateModal(true);
  };

  // Fonction pour appliquer un template
  const handleApplyTemplate = async (templateId: string, affaireId: string, dateDebut: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/planification/templates/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          affaire_id: affaireId,
          date_debut_reference: dateDebut,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Template appliqué avec succès ! ${data.count} tâche(s) créée(s).`);
        setShowTemplateModal(false);
        setShowActiviteModal(false);
        setEditingActivite(null);
        // Réinitialiser les filtres pour voir les nouvelles activités
        setFilters({
          site: "",
          affaire: "",
          responsable: "",
          statut: "",
        });
        setSearchTerm("");
        // Forcer un rafraîchissement complet
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue lors de l'application du template");
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour mettre à jour une activité
  const handleUpdateActivite = async (activiteId: string, updates: Partial<ActivitePlanification>) => {
    try {
      const response = await fetch(`/api/planification/activites/${activiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // Rafraîchir les données après mise à jour
        window.location.reload();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  // Fonction pour sauvegarder les modifications en attente
  const savePendingChanges = async () => {
    if (pendingSaves.size === 0 && pendingJalonsSaves.size === 0) return;
    
    try {
      setSaving(true);
      const saves = Array.from(pendingSaves.entries());
      const jalonsSaves = Array.from(pendingJalonsSaves.entries());
      
      // Sauvegarder toutes les modifications d'activités en parallèle
      const resultsActivites = saves.length > 0 ? await Promise.all(
        saves.map(([activiteId, updates]) =>
          fetch(`/api/planification/activites/${activiteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          })
        )
      ) : [];
      
      // Sauvegarder toutes les modifications de jalons en parallèle
      const resultsJalons = jalonsSaves.length > 0 ? await Promise.all(
        jalonsSaves.map(([jalonId, updates]) =>
          fetch(`/api/affaires/lots/${jalonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          })
        )
      ) : [];
      
      // Vérifier si toutes les sauvegardes ont réussi
      const allSuccess = resultsActivites.every(r => r.ok) && resultsJalons.every(r => r.ok);
      
      if (allSuccess) {
        // Vider les sauvegardes en attente
        setPendingSaves(new Map());
        setPendingJalonsSaves(new Map());
      } else {
        // Afficher une erreur pour les échecs
        const failedSaves = saves.filter((_, index) => !resultsActivites[index]?.ok);
        const failedJalons = jalonsSaves.filter((_, index) => !resultsJalons[index]?.ok);
        console.error("Erreurs lors de la sauvegarde:", { failedSaves, failedJalons });
        // Garder les modifications en échec pour réessayer
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde automatique:", error);
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour calculer les nouvelles dates des tâches dépendantes (propagation récursive)
  const calculerDatesTachesDependantes = (
    activiteModifiee: ActivitePlanification,
    nouvelleDateDebut: Date,
    nouvelleDateFin: Date
  ): Map<string, { date_debut_prevue: string; date_fin_prevue: string }> => {
    const updates = new Map<string, { date_debut_prevue: string; date_fin_prevue: string }>();
    const processed = new Set<string>(); // Pour éviter les boucles infinies
    
    // Fonction récursive pour calculer les dates d'une tâche en fonction de toutes ses dépendances
    const calculerDatesTache = (tache: ActivitePlanification): { dateDebut: Date; dateFin: Date } | null => {
      if (processed.has(tache.id)) {
        // Si déjà traité, retourner les dates déjà calculées
        const existingUpdate = updates.get(tache.id);
        if (existingUpdate) {
          return {
            dateDebut: new Date(existingUpdate.date_debut_prevue),
            dateFin: new Date(existingUpdate.date_fin_prevue),
          };
        }
        return null;
      }
      
      processed.add(tache.id);
      
      const dateDebutActuelle = new Date(tache.date_debut_prevue);
      const dateFinActuelle = new Date(tache.date_fin_prevue);
      const dureeActuelle = dateFinActuelle.getTime() - dateDebutActuelle.getTime();
      
      let nouvelleDateDebutTache: Date | null = null;
      let nouvelleDateFinTache: Date | null = null;
      
      // Parcourir toutes les dépendances de cette tâche
      if (tache.dependances && tache.dependances.length > 0) {
        tache.dependances.forEach(dep => {
          // Trouver l'activité précédente
          const activitePrecedente = activites.find(a => a.id === dep.activite_precedente_id);
          if (!activitePrecedente) return;
          
          // Si l'activité précédente a été modifiée, utiliser ses nouvelles dates
          let dateDebutPrecedente: Date;
          let dateFinPrecedente: Date;
          
          if (activitePrecedente.id === activiteModifiee.id) {
            // C'est la tâche directement modifiée
            dateDebutPrecedente = nouvelleDateDebut;
            dateFinPrecedente = nouvelleDateFin;
          } else {
            // Sinon, calculer récursivement les dates de l'activité précédente
            const datesPrecedente = calculerDatesTache(activitePrecedente);
            if (datesPrecedente) {
              dateDebutPrecedente = datesPrecedente.dateDebut;
              dateFinPrecedente = datesPrecedente.dateFin;
            } else {
              dateDebutPrecedente = new Date(activitePrecedente.date_debut_prevue);
              dateFinPrecedente = new Date(activitePrecedente.date_fin_prevue);
            }
          }
          
          const delaiJours = dep.delai_jours || 0;
          const delaiMs = delaiJours * 24 * 60 * 60 * 1000;
          
          switch (dep.type_dependance) {
            case 'FS': // Finish-to-Start : début après fin de la précédente
              const dateDebutFS = new Date(dateFinPrecedente.getTime() + delaiMs);
              if (!nouvelleDateDebutTache || dateDebutFS > nouvelleDateDebutTache) {
                nouvelleDateDebutTache = dateDebutFS;
              }
              break;
            case 'SS': // Start-to-Start : début en même temps (ou avec délai)
              const dateDebutSS = new Date(dateDebutPrecedente.getTime() + delaiMs);
              if (!nouvelleDateDebutTache || dateDebutSS > nouvelleDateDebutTache) {
                nouvelleDateDebutTache = dateDebutSS;
              }
              break;
            case 'FF': // Finish-to-Finish : fin en même temps (ou avec délai)
              const dateFinFF = new Date(dateFinPrecedente.getTime() + delaiMs);
              if (!nouvelleDateFinTache || dateFinFF > nouvelleDateFinTache) {
                nouvelleDateFinTache = dateFinFF;
              }
              break;
            case 'SF': // Start-to-Finish : fin au début de la précédente (ou avec délai)
              const dateFinSF = new Date(dateDebutPrecedente.getTime() + delaiMs);
              if (!nouvelleDateFinTache || dateFinSF > nouvelleDateFinTache) {
                nouvelleDateFinTache = dateFinSF;
              }
              break;
          }
        });
      }
      
      // Si on a calculé de nouvelles dates, les appliquer
      if (nouvelleDateDebutTache || nouvelleDateFinTache) {
        let dateDebut = nouvelleDateDebutTache || dateDebutActuelle;
        let dateFin = nouvelleDateFinTache || dateFinActuelle;
        
        // Si seule la date de début a changé, ajuster la date de fin pour garder la durée
        if (nouvelleDateDebutTache && !nouvelleDateFinTache) {
          dateFin = new Date(dateDebut.getTime() + dureeActuelle);
        }
        // Si seule la date de fin a changé, ajuster la date de début pour garder la durée
        else if (!nouvelleDateDebutTache && nouvelleDateFinTache) {
          dateDebut = new Date(dateFin.getTime() - dureeActuelle);
        }
        
        // Snap au jour
        dateDebut.setHours(0, 0, 0, 0);
        dateFin.setHours(0, 0, 0, 0);
        
        const update = {
          date_debut_prevue: dateDebut.toISOString(),
          date_fin_prevue: dateFin.toISOString(),
        };
        
        updates.set(tache.id, update);
        return { dateDebut, dateFin };
      }
      
      return null;
    };
    
    // Trouver toutes les tâches qui dépendent directement de l'activité modifiée
    const tachesDependantesDirectes = activites.filter(act => 
      act.dependances?.some(dep => dep.activite_precedente_id === activiteModifiee.id)
    );
    
    // Calculer récursivement les dates pour chaque tâche dépendante
    tachesDependantesDirectes.forEach(tache => {
      calculerDatesTache(tache);
    });
    
    return updates;
  };

  // Fonction pour mettre à jour les jalons basés sur les tâches liées
  const mettreAJourJalons = () => {
    // Pour chaque jalon, trouver les tâches liées et calculer min/max
    const jalonsModifies = new Map<string, { date_debut_previsionnelle: string; date_fin_previsionnelle: string }>();
    
    // Utiliser l'état local des activités pour avoir les valeurs à jour
    jalonsLocaux.forEach(jalon => {
      const activitesJalon = activites.filter(act => act.lot_id === jalon.id && act.date_debut_prevue && act.date_fin_prevue);
      
      if (activitesJalon.length > 0) {
        const datesDebut = activitesJalon.map(act => new Date(act.date_debut_prevue).getTime());
        const datesFin = activitesJalon.map(act => new Date(act.date_fin_prevue).getTime());
        
        const minDebut = new Date(Math.min(...datesDebut));
        const maxFin = new Date(Math.max(...datesFin));
        
        minDebut.setHours(0, 0, 0, 0);
        maxFin.setHours(0, 0, 0, 0);
        
        jalonsModifies.set(jalon.id, {
          date_debut_previsionnelle: minDebut.toISOString(),
          date_fin_previsionnelle: maxFin.toISOString(),
        });
      }
    });
    
    return jalonsModifies;
  };

  // Handler pour le drag & drop
  const handleDragEnd = async (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => {
    // Trouver l'activité modifiée
    const activiteModifiee = activites.find(a => a.id === activiteId);
    if (!activiteModifiee) return;
    
    // Vérifier si le drag est autorisé selon le statut
    const statutsBloquesDrag = ['lancee', 'prolongee', 'suspendue', 'terminee'];
    if (statutsBloquesDrag.includes(activiteModifiee.statut)) {
      // Ne pas effectuer le drag, retourner silencieusement (le message est déjà affiché dans useGanttDrag)
      return;
    }
    
    // Mise à jour optimiste immédiate de l'état local pour la tâche déplacée
    setActivites(prev => prev.map(act => 
      act.id === activiteId 
        ? { ...act, date_debut_prevue: nouvelleDateDebut.toISOString(), date_fin_prevue: nouvelleDateFin.toISOString() }
        : act
    ));
    
    // Calculer les nouvelles dates des tâches dépendantes
    const updatesTachesDependantes = calculerDatesTachesDependantes(
      activiteModifiee,
      nouvelleDateDebut,
      nouvelleDateFin
    );
    
    // Mettre à jour les tâches dépendantes dans l'état local
    setActivites(prev => prev.map(act => {
      const update = updatesTachesDependantes.get(act.id);
      if (update) {
        return { ...act, date_debut_prevue: update.date_debut_prevue, date_fin_prevue: update.date_fin_prevue };
      }
      return act;
    }));
    
    // Mettre à jour les jalons
    const updatesJalons = mettreAJourJalons();
    
    // Mettre à jour les jalons dans l'état local
    setJalonsLocaux(prev => prev.map(jalon => {
      const update = updatesJalons.get(jalon.id);
      if (update) {
        return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
      }
      return jalon;
    }));
    
    // Ajouter toutes les modifications à la file d'attente de sauvegarde
    setPendingSaves(prev => {
      const newMap = new Map(prev);
      
      // Ajouter la tâche principale
      newMap.set(activiteId, {
        date_debut_prevue: nouvelleDateDebut.toISOString(),
        date_fin_prevue: nouvelleDateFin.toISOString(),
      });
      
      // Ajouter les tâches dépendantes
      updatesTachesDependantes.forEach((update, taskId) => {
        newMap.set(taskId, update);
      });
      
      return newMap;
    });
    
    // Ajouter les jalons modifiés à la file d'attente
    setPendingJalonsSaves(prev => {
      const newMap = new Map(prev);
      updatesJalons.forEach((update, jalonId) => {
        newMap.set(jalonId, update);
      });
      return newMap;
    });
    
    // Annuler le timer précédent et en créer un nouveau (debounce)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Sauvegarder automatiquement après 2 secondes d'inactivité
    saveTimeoutRef.current = setTimeout(() => {
      savePendingChanges();
    }, 2000);
  };

  // Fonction pour calculer le nombre de jours ouvrés entre deux dates
  const calculerJoursOuvres = (dateDebut: Date, dateFin: Date, typeHoraire: string): number => {
    if (!dateDebut || !dateFin || dateFin < dateDebut) return 0;
    
    // Pour les types horaires qui incluent tous les jours (3x8, accéléré)
    if (typeHoraire === "3x8" || typeHoraire === "accelerer") {
      const diffTime = dateFin.getTime() - dateDebut.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le jour de début
    }
    
    // Pour les autres types (jour, nuit, weekend, férié), compter les jours ouvrés (exclure weekends)
    let joursOuvres = 0;
    const dateCourante = new Date(dateDebut);
    dateCourante.setHours(0, 0, 0, 0);
    const dateFinNorm = new Date(dateFin);
    dateFinNorm.setHours(0, 0, 0, 0);
    
    while (dateCourante <= dateFinNorm) {
      const jourSemaine = dateCourante.getDay(); // 0 = dimanche, 6 = samedi
      // Exclure samedi (6) et dimanche (0)
      if (jourSemaine !== 0 && jourSemaine !== 6) {
        joursOuvres++;
      }
      dateCourante.setDate(dateCourante.getDate() + 1);
    }
    
    return joursOuvres;
  };

  // Handler pour le redimensionnement
  const handleResizeEnd = async (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => {
    // Trouver l'activité modifiée
    const activiteModifiee = activites.find(a => a.id === activiteId);
    if (!activiteModifiee) return;
    
    // Vérifier si le resize est autorisé selon le statut
    const statutsBloquesResize = ['suspendue', 'terminee'];
    if (statutsBloquesResize.includes(activiteModifiee.statut)) {
      // Ne pas effectuer le resize, retourner silencieusement (le message est déjà affiché dans useGanttResize)
      return;
    }
    
    // Pour les statuts "lancee" et "prolongee", ne modifier que la date de fin
    const ancienneDateDebut = new Date(activiteModifiee.date_debut_prevue);
    const ancienneDateFin = new Date(activiteModifiee.date_fin_prevue);
    const ancienneDuree = ancienneDateFin.getTime() - ancienneDateDebut.getTime();
    
    let dateDebutFinale = nouvelleDateDebut;
    let dateFinFinale = nouvelleDateFin;
    let nouveauStatut = activiteModifiee.statut;
    
    if (activiteModifiee.statut === 'lancee' || activiteModifiee.statut === 'prolongee') {
      // Ne modifier que la date de fin, conserver la date de début
      dateDebutFinale = ancienneDateDebut;
      dateFinFinale = nouvelleDateFin;
      
      // Si la durée a été étendue, passer au statut "prolongee" si ce n'est pas déjà le cas
      const nouvelleDuree = dateFinFinale.getTime() - dateDebutFinale.getTime();
      if (nouvelleDuree > ancienneDuree && activiteModifiee.statut !== 'prolongee') {
        nouveauStatut = 'prolongee';
      }
    }
    
    const typeHoraire = activiteModifiee.type_horaire || "jour";
    
    // Calculer le nouveau nombre de jours ouvrés
    const nouvelleDureeJoursOuvres = calculerJoursOuvres(dateDebutFinale, dateFinFinale, typeHoraire);
    
    // Mise à jour optimiste immédiate de l'état local pour la tâche redimensionnée
    setActivites(prev => prev.map(act => 
      act.id === activiteId 
        ? { 
            ...act, 
            date_debut_prevue: dateDebutFinale.toISOString(), 
            date_fin_prevue: dateFinFinale.toISOString(),
            duree_jours_ouvres: nouvelleDureeJoursOuvres,
            statut: nouveauStatut
          }
        : act
    ));
    
    // Calculer les nouvelles dates des tâches dépendantes (utiliser les dates finales)
    const updatesTachesDependantes = calculerDatesTachesDependantes(
      activiteModifiee,
      dateDebutFinale,
      dateFinFinale
    );
    
    // Mettre à jour les tâches dépendantes dans l'état local
    setActivites(prev => prev.map(act => {
      const update = updatesTachesDependantes.get(act.id);
      if (update) {
        return { ...act, date_debut_prevue: update.date_debut_prevue, date_fin_prevue: update.date_fin_prevue };
      }
      return act;
    }));
    
    // Mettre à jour les jalons
    const updatesJalons = mettreAJourJalons();
    
    // Mettre à jour les jalons dans l'état local
    setJalonsLocaux(prev => prev.map(jalon => {
      const update = updatesJalons.get(jalon.id);
      if (update) {
        return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
      }
      return jalon;
    }));
    
    // Si le statut a changé, sauvegarder immédiatement le changement de statut
    if (nouveauStatut !== activiteModifiee.statut) {
      fetch(`/api/planification/activites/${activiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: nouveauStatut,
        }),
      }).catch(err => console.error("Erreur lors de la mise à jour du statut:", err));
    }
    
    // Ajouter toutes les modifications à la file d'attente de sauvegarde
    setPendingSaves(prev => {
      const newMap = new Map(prev);
      
      // Ajouter la tâche principale avec la nouvelle durée (utiliser les dates finales)
      newMap.set(activiteId, {
        date_debut_prevue: dateDebutFinale.toISOString(),
        date_fin_prevue: dateFinFinale.toISOString(),
        duree_jours_ouvres: nouvelleDureeJoursOuvres,
      });
      
      // Ajouter les tâches dépendantes
      updatesTachesDependantes.forEach((update, taskId) => {
        newMap.set(taskId, update);
      });
      
      return newMap;
    });
    
    // Ajouter les jalons modifiés à la file d'attente
    setPendingJalonsSaves(prev => {
      const newMap = new Map(prev);
      updatesJalons.forEach((update, jalonId) => {
        newMap.set(jalonId, update);
      });
      return newMap;
    });
    
    // Annuler le timer précédent et en créer un nouveau (debounce)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Sauvegarder automatiquement après 2 secondes d'inactivité
    saveTimeoutRef.current = setTimeout(() => {
      savePendingChanges();
    }, 2000);
  };

  // Fonction pour calculer la date de fin en fonction de la durée et du type horaire
  const calculerDateFin = async (dateDebutStr: string, duree: number, unite: "jours" | "semaines", typeHoraire: string) => {
    try {
      // Convertir semaines en jours si nécessaire
      const joursCalcul = unite === "semaines" ? duree * 7 : duree;
      
      const response = await fetch("/api/planification/calculer-date-fin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_debut: dateDebutStr,
          duree_jours_ouvres: joursCalcul,
          type_horaire: typeHoraire,
          calendrier_id: selectedCalendrierId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.date_fin) {
          // Convertir en format datetime-local (YYYY-MM-DDTHH:mm)
          const dateFin = new Date(data.date_fin);
          const formattedDate = new Date(dateFin.getTime() - dateFin.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setDateFinCalculee(formattedDate);
          
          // Calculer automatiquement les heures prévues si calendrier sélectionné
          if (selectedCalendrierId && dateDebutStr && formattedDate) {
            await calculerHeuresPrevues(dateDebutStr, formattedDate);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du calcul de la date de fin:", error);
    }
  };

  // Fonction pour calculer les heures prévues selon le calendrier
  const calculerHeuresPrevues = async (dateDebutStr: string, dateFinStr: string) => {
    if (!selectedCalendrierId || !dateDebutStr || !dateFinStr) {
      return;
    }

    try {
      // Récupérer le site_id de l'affaire sélectionnée si disponible
      const affaireSelectionnee = affaires.find(a => a.id === selectedAffaireId);
      const siteId = affaireSelectionnee?.site_id || null;

      const response = await fetch("/api/planification/calculer-heures-prevues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_debut: dateDebutStr,
          date_fin: dateFinStr,
          calendrier_id: selectedCalendrierId,
          site_id: siteId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.heures_prevues !== undefined) {
          setHeuresPrevuesAuto(data.heures_prevues);
          // Mettre à jour le champ heures_prevues dans le formulaire
          const heuresInput = document.querySelector('input[name="heures_prevues"]') as HTMLInputElement;
          if (heuresInput) {
            heuresInput.value = data.heures_prevues.toString();
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors du calcul des heures prévues:", error);
    }
  };


  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
                Planification & Suivi
              </h1>
              <p className="text-base sm:text-lg text-secondary">
                Gantt multi-affaires, suivi quotidien et valorisation horaire
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowGestionTemplatesModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Gérer les templates"
              >
                <FileText className="h-5 w-5" />
                Templates
              </button>
              <button
                onClick={handleCreateActivite}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nouvelle activité
              </button>
            </div>
          </div>

          {/* Onglets */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveView("gantt")}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeView === "gantt"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Gantt
              </button>
              <button
                onClick={() => setActiveView("alertes")}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeView === "alertes"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Alertes
              </button>
            </nav>
          </div>

          {/* Filtres */}
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  value={filters.site}
                  onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Tous</option>
                  {sites.map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.site_code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Affaire</label>
                <select
                  value={filters.affaire}
                  onChange={(e) => setFilters({ ...filters, affaire: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Toutes</option>
                  {affaires.map((affaire) => (
                    <option key={affaire.id} value={affaire.id}>
                      {affaire.numero} - {affaire.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.statut}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Tous</option>
                  <option value="planifiee">Planifiée</option>
                  <option value="lancee">Lancée</option>
                  <option value="suspendue">Suspendue</option>
                  <option value="terminee">Terminée</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu selon vue active */}
        {activeView === "gantt" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold text-secondary">
                Planning Gantt ({(() => {
                  // Compter toutes les activités (même sans dates) pour le compteur
                  const count = selectedAffaireGantt 
                    ? activites.filter(a => a.affaire_id === selectedAffaireGantt).length
                    : activites.length;
                  return count;
                })()} activité{(() => {
                  const count = selectedAffaireGantt 
                    ? activites.filter(a => a.affaire_id === selectedAffaireGantt).length
                    : activites.length;
                  return count > 1 ? "s" : "";
                })()})
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={vueGantt}
                  onChange={(e) => setVueGantt(e.target.value as "jour" | "semaine" | "mois")}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="jour">Vue Jour</option>
                  <option value="semaine">Vue Semaine</option>
                  <option value="mois">Vue Mois</option>
                </select>
                <select
                  value={filters.statut || ""}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Tous les statuts</option>
                  <option value="planifiee">Planifiée</option>
                  <option value="lancee">Lancée</option>
                  <option value="terminee">Terminée</option>
                </select>
                {saving && (
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Enregistrement...
                  </span>
                )}
              </div>
            </div>
            
            {/* Section Affaires en attente de planification - visible uniquement pour planificateurs */}
            {isPlanificateur && (
              <>
                <AffairesEnAttente
                  userId={userId}
                  onCreateActivite={(affaireId) => {
                    // Pré-remplir le modal avec l'affaire sélectionnée
                    setEditingActivite({
                      id: "",
                      affaire_id: affaireId,
                    } as any);
                    setShowActiviteModal(true);
                  }}
                />
                {/* Section Affaires planifiées */}
                <AffairesPlanifiees
                  onCreateActivite={(affaireId) => {
                    // Pré-remplir le modal avec l'affaire sélectionnée
                    setEditingActivite({
                      id: "",
                      affaire_id: affaireId,
                    } as any);
                    setShowActiviteModal(true);
                  }}
                  onSelectAffaire={(affaireId) => {
                    setSelectedAffaireGantt(affaireId);
                  }}
                  selectedAffaireId={selectedAffaireGantt}
                />
              </>
            )}

            {/* Gantt - affiché uniquement si une affaire est sélectionnée */}
            {selectedAffaireGantt ? (
              <GanttTimeline
                activites={filteredActivites.filter(a => a.date_debut_prevue && a.date_fin_prevue)}
                jalons={filteredJalons}
                vue={vueGantt}
                onActiviteClick={(activite) => {
                  // Ouvrir modal de détails ou édition
                  setEditingActivite(activite);
                  setShowActiviteModal(true);
                }}
                onJalonClick={(jalon) => {
                  // Rediriger vers la page de l'affaire
                  if (jalon.affaire_id) {
                    router.push(`/affaires/${jalon.affaire_id}`);
                  }
                }}
                onDragEnd={isPlanificateur ? handleDragEnd : undefined}
                onResizeEnd={isPlanificateur ? handleResizeEnd : undefined}
              />
            ) : (
              <div className="card text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Sélectionnez une affaire pour afficher le Gantt</p>
                <p className="text-sm text-gray-500">Cliquez sur une carte d'affaire ci-dessus pour voir son planning</p>
              </div>
            )}
          </div>
        )}

        {activeView === "alertes" && (
          <div className="card">
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary mb-2">
                Alertes planification
              </h2>
              <p className="text-gray-600 mb-6">
                Liste des alertes automatiques à implémenter
              </p>
            </div>
          </div>
        )}

        {/* Modal Gestion Templates */}
        <GestionTemplatesModal
          isOpen={showGestionTemplatesModal}
          onClose={() => setShowGestionTemplatesModal(false)}
        />

        {/* Modal Sélection Template (avant création) */}
        {showTemplateModal && (
          <TemplateSelectorModal
            affaires={affaires}
            onSelectTemplate={handleApplyTemplate}
            onSkipTemplate={() => {
              setShowTemplateModal(false);
              setShowActiviteModal(true);
            }}
            onClose={() => {
              setShowTemplateModal(false);
              setShowActiviteModal(false);
              setEditingActivite(null);
            }}
          />
        )}

        {/* Modal Création/Édition Activité */}
        {showActiviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-primary">
                  {editingActivite?.id ? "Modifier l'activité" : "Nouvelle activité"}
                </h2>
                  <button
                    onClick={() => {
                      // Mettre à jour les jalons avant de fermer le modal
                      const updatesJalons = mettreAJourJalons();
                      
                      if (updatesJalons.size > 0) {
                        // Mettre à jour les jalons dans l'état local
                        setJalonsLocaux(prev => prev.map(jalon => {
                          const update = updatesJalons.get(jalon.id);
                          if (update) {
                            return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
                          }
                          return jalon;
                        }));
                        
                        // Ajouter les jalons modifiés à la file d'attente
                        setPendingJalonsSaves(prev => {
                          const newMap = new Map(prev);
                          updatesJalons.forEach((update, jalonId) => {
                            newMap.set(jalonId, update);
                          });
                          return newMap;
                        });
                        
                        // Sauvegarder immédiatement les jalons
                        savePendingChanges();
                      }
                      
                      setShowActiviteModal(false);
                      setEditingActivite(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
              </div>
              
              {/* Section Templates (uniquement en création) */}
              {!editingActivite?.id && (
                <div className="p-6 border-b bg-blue-50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Template de tâches (optionnel)</h3>
                  <div className="flex items-center gap-3">
                    <select
                      id="template-select"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      onChange={async (e) => {
                        const templateId = e.target.value;
                        if (!templateId) return;
                        
                        const affaireId = editingActivite?.affaire_id || filters.affaire;
                        if (!affaireId) {
                          alert("Veuillez d'abord sélectionner une affaire");
                          return;
                        }
                        
                        setSaving(true);
                        try {
                          const response = await fetch(`/api/planification/templates/apply`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              template_id: templateId,
                              affaire_id: affaireId,
                              date_debut_reference: new Date().toISOString(),
                            }),
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            alert(`Template appliqué avec succès ! ${data.count} tâche(s) créée(s).`);
                            setShowActiviteModal(false);
                            setEditingActivite(null);
                            // Réinitialiser les filtres pour voir les nouvelles activités
                            setFilters({
                              site: "",
                              affaire: "",
                              responsable: "",
                              statut: "",
                            });
                            setSearchTerm("");
                            // Forcer un rafraîchissement complet
                            window.location.reload();
                          } else {
                            const error = await response.json();
                            alert(`Erreur: ${error.error || "Erreur inconnue"}`);
                          }
                        } catch (error) {
                          console.error("Erreur:", error);
                          alert("Une erreur est survenue lors de l'application du template");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <option value="">Aucun template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.nom_template}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">Les tâches seront créées automatiquement</span>
                  </div>
                </div>
              )}

              <form
                className="p-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSaving(true);

                  const formData = new FormData(e.currentTarget);
                  
                  // Validation du motif de report si statut = "reportee"
                  if (statutActivite === 'reportee' && !motifReport.trim()) {
                    alert("Le motif du report est obligatoire.");
                    setSaving(false);
                    return;
                  }
                  
                  const payload: any = {
                    affaire_id: formData.get("affaire_id") as string,
                    lot_id: formData.get("lot_id") || null,
                    libelle: formData.get("libelle") as string,
                    description: formData.get("description") || null,
                    date_debut_prevue: dateDebut || (formData.get("date_debut_prevue") as string),
                    date_fin_prevue: (calculAutoDateFin && dateFinCalculee) 
                      ? new Date(dateFinCalculee).toISOString()
                      : (formData.get("date_fin_prevue") as string),
                    responsable_id: formData.get("responsable_id") || null,
                    heures_prevues: heuresPrevuesAuto !== null && selectedCalendrierId ? heuresPrevuesAuto : (parseFloat(formData.get("heures_prevues") as string) || 0),
                    type_horaire: formData.get("type_horaire") as string || "jour",
                    coefficient: parseFloat(formData.get("coefficient") as string) || 1.0,
                    calendrier_id: selectedCalendrierId || null,
                    statut: statutActivite,
                  };
                  
                  // Si le statut est "reportee", ajouter le motif dans le commentaire
                  if (statutActivite === 'reportee' && motifReport.trim()) {
                    const commentaireActuel = formData.get("description") as string || "";
                    payload.commentaire = `[REPORT] ${motifReport.trim()}${commentaireActuel ? `\n\n${commentaireActuel}` : ''}`;
                  }
                  
                  // Nouveaux champs hiérarchie
                  const parentId = formData.get("parent_id") as string;
                  if (parentId) payload.parent_id = parentId;
                  
                  // Note: Les dépendances multiples sont gérées séparément via l'API /dependances
                  // On ne charge plus activite_precedente_id et type_dependance dans le payload
                  
                  // Nouveaux champs jours ouvrés
                  const dureeJoursOuvresForm = formData.get("duree_jours_ouvres") as string;
                  const calculAutoDateFinForm = calculAutoDateFin || (formData.get("calcul_auto_date_fin") === "true");
                  if (dureeJoursOuvresForm) payload.duree_jours_ouvres = parseInt(dureeJoursOuvresForm);
                  payload.calcul_auto_date_fin = calculAutoDateFinForm;
                  
                  // Si calcul auto, utiliser la date calculée
                  if (calculAutoDateFinForm && dateFinCalculee) {
                    payload.date_fin_prevue = new Date(dateFinCalculee).toISOString();
                  } else {
                    payload.date_fin_prevue = formData.get("date_fin_prevue") as string;
                  }

                  try {
                    // Vérifier si on est en mode édition (editingActivite avec un ID)
                    const isEditMode = editingActivite && editingActivite.id;
                    const url = isEditMode
                      ? `/api/planification/activites/${editingActivite.id}`
                      : "/api/planification/activites";
                    const method = isEditMode ? "PATCH" : "POST";

                    const response = await fetch(url, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      const nouvelleActiviteId = data.activite?.id || data.id;
                      const lotId = payload.lot_id;
                      
                      // Si la nouvelle activité est liée à un jalon, créer automatiquement une dépendance avec la dernière activité du jalon
                      if (nouvelleActiviteId && lotId && !isEditMode) {
                        try {
                          // Trouver toutes les activités du même jalon (triées par ordre de création ou numéro)
                          const activitesJalon = activites
                            .filter(act => act.lot_id === lotId && act.id !== nouvelleActiviteId)
                            .sort((a, b) => {
                              // Trier par numero_hierarchique si disponible, sinon par date de création
                              if (a.numero_hierarchique && b.numero_hierarchique) {
                                return a.numero_hierarchique.localeCompare(b.numero_hierarchique);
                              }
                              if (a.numero_hierarchique) return -1;
                              if (b.numero_hierarchique) return 1;
                              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                            });
                          
                          // Prendre la dernière activité créée (ou la première si aucune autre)
                          const derniereActiviteJalon = activitesJalon[activitesJalon.length - 1] || activitesJalon[0];
                          
                          if (derniereActiviteJalon) {
                            // Créer automatiquement une dépendance FS (Finish-to-Start) avec la dernière activité du jalon
                            await fetch("/api/planification/dependances", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                activite_id: nouvelleActiviteId,
                                activite_precedente_id: derniereActiviteJalon.id,
                                type_dependance: "FS",
                                delai_jours: 0,
                              }),
                            });
                          }
                        } catch (error) {
                          console.error("Erreur lors de la création automatique de la dépendance:", error);
                        }
                      }
                      
                      // Sauvegarder les dépendances en attente si l'activité a été créée
                      if (nouvelleActiviteId && dependancesEnAttente.length > 0) {
                        try {
                          await Promise.all(
                            dependancesEnAttente.map((dep) =>
                              fetch("/api/planification/dependances", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  activite_id: nouvelleActiviteId,
                                  activite_precedente_id: dep.activite_precedente_id,
                                  type_dependance: dep.type_dependance,
                                  delai_jours: dep.delai_jours || 0,
                                }),
                              })
                            )
                          );
                        } catch (error) {
                          console.error("Erreur lors de la sauvegarde des dépendances:", error);
                        }
                      }
                      
                      setDependancesEnAttente([]);
                      
                      // Mettre à jour les jalons après création/modification d'activité
                      const updatesJalons = mettreAJourJalons();
                      
                      // Mettre à jour les jalons dans l'état local
                      setJalonsLocaux(prev => prev.map(jalon => {
                        const update = updatesJalons.get(jalon.id);
                        if (update) {
                          return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
                        }
                        return jalon;
                      }));
                      
                      // Ajouter les jalons modifiés à la file d'attente
                      setPendingJalonsSaves(prev => {
                        const newMap = new Map(prev);
                        updatesJalons.forEach((update, jalonId) => {
                          newMap.set(jalonId, update);
                        });
                        return newMap;
                      });
                      
                      // Sauvegarder immédiatement les jalons
                      savePendingChanges();
                      
                      setShowActiviteModal(false);
                      setEditingActivite(null);
                      // Réinitialiser les filtres pour voir la nouvelle activité
                      setFilters({
                        site: "",
                        affaire: "",
                        responsable: "",
                        statut: "",
                      });
                      setSearchTerm("");
                      // Forcer un rafraîchissement complet pour afficher la nouvelle activité
                      setTimeout(() => {
                        window.location.reload();
                      }, 300);
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
                }}
              >
                <div className="space-y-6">
                  {/* Section 1 : Identification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Affaire <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="affaire_id"
                        id="affaire_id"
                        required
                        defaultValue={editingActivite?.affaire_id || filters.affaire}
                        onChange={(e) => {
                          setSelectedAffaireId(e.target.value);
                          // Réinitialiser le jalon si l'affaire change
                          const lotSelect = document.getElementById("lot_id") as HTMLSelectElement;
                          if (lotSelect) {
                            lotSelect.value = "";
                          }
                        }}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calendrier
                      </label>
                      <select
                        value={selectedCalendrierId}
                        onChange={async (e) => {
                          setSelectedCalendrierId(e.target.value);
                          // Recalculer les heures prévues si dates et durée sont définies
                          if (e.target.value && dateDebut && (dateFinCalculee || (editingActivite?.date_fin_prevue))) {
                            const dateFin = dateFinCalculee || (editingActivite?.date_fin_prevue ? new Date(editingActivite.date_fin_prevue).toISOString().slice(0, 16) : "");
                            if (dateFin) {
                              await calculerHeuresPrevues(dateDebut, dateFin);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Aucun calendrier (calcul par défaut)</option>
                        {calendriers.map((calendrier) => (
                          <option key={calendrier.id} value={calendrier.id}>
                            {calendrier.libelle}
                            {calendrier.site_id ? ` (Site)` : " (Global)"}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Les heures prévues seront calculées automatiquement selon ce calendrier
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Libellé <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="libelle"
                        required
                        defaultValue={editingActivite?.libelle || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Ex: Réalisation du dossier"
                      />
                    </div>
                  </div>

                  {/* Section 2 : Durée et calcul automatique (remontée en haut) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Durée et calcul automatique</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unité de durée
                        </label>
                        <select
                          value={uniteDuree}
                          onChange={async (e) => {
                            setUniteDuree(e.target.value as "jours" | "semaines");
                            if (calculAutoDateFin && dateDebut && dureeJoursOuvres) {
                              await calculerDateFin(dateDebut, parseInt(dureeJoursOuvres), e.target.value as "jours" | "semaines", typeHoraireSelectionne);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                        >
                          <option value="jours">Jours</option>
                          <option value="semaines">Semaines</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée {uniteDuree === "semaines" ? "(semaines)" : "(jours)"}
                        </label>
                        <input
                          type="number"
                          name="duree_jours_ouvres"
                          min="1"
                          step={uniteDuree === "semaines" ? "0.5" : "1"}
                          value={dureeJoursOuvres || (editingActivite?.duree_jours_ouvres || "")}
                          onChange={async (e) => {
                            setDureeJoursOuvres(e.target.value);
                            if (calculAutoDateFin && dateDebut && e.target.value) {
                              await calculerDateFin(dateDebut, parseFloat(e.target.value), uniteDuree, typeHoraireSelectionne);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                          placeholder={uniteDuree === "semaines" ? "Ex: 2" : "Ex: 5"}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {typeHoraireSelectionne === "jour" 
                            ? "Exclut weekends et jours fériés"
                            : typeHoraireSelectionne === "3x8"
                            ? "Travail 24/7 (inclut weekends)"
                            : typeHoraireSelectionne === "weekend" || typeHoraireSelectionne === "ferie"
                            ? "Inclut tous les jours"
                            : "Calcul selon le calendrier sélectionné"}
                        </p>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer w-full">
                          <input
                            type="checkbox"
                            name="calcul_auto_date_fin"
                            value="true"
                            checked={calculAutoDateFin || (editingActivite?.calcul_auto_date_fin || false)}
                            onChange={async (e) => {
                              setCalculAutoDateFin(e.target.checked);
                              if (e.target.checked && dateDebut && dureeJoursOuvres) {
                                await calculerDateFin(dateDebut, parseFloat(dureeJoursOuvres), uniteDuree, typeHoraireSelectionne);
                              } else {
                                setDateFinCalculee("");
                              }
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            Calculer automatiquement la date de fin
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 3 : Dates et planning */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date début <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="date_debut_prevue"
                        required
                        value={dateDebut || (editingActivite?.date_debut_prevue ? new Date(editingActivite.date_debut_prevue).toISOString().slice(0, 16) : "")}
                        onChange={(e) => {
                          setDateDebut(e.target.value);
                          
                          // Si le statut est "reportee", recalculer automatiquement la date de fin
                          if (statutActivite === 'reportee' && editingActivite && e.target.value) {
                            const ancienneDateDebut = new Date(editingActivite.date_debut_prevue);
                            const ancienneDateFin = new Date(editingActivite.date_fin_prevue);
                            const dureeInitiale = ancienneDateFin.getTime() - ancienneDateDebut.getTime();
                            
                            const nouvelleDateDebut = new Date(e.target.value);
                            nouvelleDateDebut.setHours(0, 0, 0, 0);
                            const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeInitiale);
                            nouvelleDateFin.setHours(0, 0, 0, 0);
                            
                            setDateFinCalculee(nouvelleDateFin.toISOString().slice(0, 16));
                          } else if (calculAutoDateFin && dureeJoursOuvres && e.target.value) {
                            calculerDateFin(e.target.value, parseInt(dureeJoursOuvres), uniteDuree, typeHoraireSelectionne);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date fin <span className="text-red-500">*</span>
                        {calculAutoDateFin && (
                          <span className="ml-2 text-xs text-blue-600 font-normal">(calculée automatiquement)</span>
                        )}
                      </label>
                      <input
                        type="datetime-local"
                        name="date_fin_prevue"
                        required={!calculAutoDateFin}
                        disabled={calculAutoDateFin}
                        value={calculAutoDateFin ? dateFinCalculee : (editingActivite?.date_fin_prevue ? new Date(editingActivite.date_fin_prevue).toISOString().slice(0, 16) : "")}
                        onChange={async (e) => {
                          if (!calculAutoDateFin) {
                            setDateFinCalculee(e.target.value);
                            // Recalculer les heures prévues si calendrier et date début sont définis
                            if (selectedCalendrierId && dateDebut && e.target.value) {
                              await calculerHeuresPrevues(dateDebut, e.target.value);
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                          calculAutoDateFin ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type horaire</label>
                      <select
                        name="type_horaire"
                        defaultValue={editingActivite?.type_horaire || "jour"}
                        onChange={async (e) => {
                          setTypeHoraireSelectionne(e.target.value);
                          if (calculAutoDateFin && dateDebut && dureeJoursOuvres) {
                            await calculerDateFin(dateDebut, parseInt(dureeJoursOuvres), uniteDuree, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="jour">Jour (HN 5/7)</option>
                        <option value="nuit">Nuit</option>
                        <option value="weekend">Week-end</option>
                        <option value="ferie">Férié</option>
                        <option value="3x8">3x8</option>
                        <option value="accelerer">Accéléré</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heures prévues
                        {heuresPrevuesAuto !== null && selectedCalendrierId && (
                          <span className="ml-2 text-xs text-blue-600 font-normal">(calculées automatiquement)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        name="heures_prevues"
                        step="0.5"
                        min="0"
                        value={heuresPrevuesAuto !== null && selectedCalendrierId ? heuresPrevuesAuto : (editingActivite?.heures_prevues || 0)}
                        onChange={(e) => {
                          // Si calendrier sélectionné, on peut toujours modifier manuellement
                          setHeuresPrevuesAuto(null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder={heuresPrevuesAuto !== null && selectedCalendrierId ? heuresPrevuesAuto.toString() : "0"}
                      />
                      {selectedCalendrierId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Basé sur le calendrier sélectionné (exclut jours fériés)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section 4 : Organisation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsable de la tâche
                      </label>
                      <select
                        name="responsable_id"
                        defaultValue={editingActivite?.responsable_id || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Aucun responsable</option>
                        {_collaborateurs.map((collab) => (
                          <option key={collab.id} value={collab.id}>
                            {collab.prenom} {collab.nom}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Le responsable verra cette tâche dans son suivi
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jalon (optionnel)
                      </label>
                      <select
                        name="lot_id"
                        id="lot_id"
                        defaultValue={editingActivite?.lot_id || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Aucun jalon</option>
                        {(() => {
                          const affaireId = selectedAffaireId || editingActivite?.affaire_id || filters.affaire;
                          const jalonsAffaire = affaireId ? jalons.filter(j => j.affaire_id === affaireId) : [];
                          return jalonsAffaire.map((jalon) => (
                            <option key={jalon.id} value={jalon.id}>
                              {jalon.numero_lot} - {jalon.libelle_lot}
                            </option>
                          ));
                        })()}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Lier cette activité à un milestone
                      </p>
                    </div>
                  </div>

                  {/* Section 5 : Statut et Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="statut"
                        value={statutActivite}
                        onChange={(e) => {
                          setStatutActivite(e.target.value);
                          // Si le statut passe à "reportee", recalculer automatiquement la date de fin
                          if (e.target.value === 'reportee' && dateDebut && editingActivite) {
                            const ancienneDateDebut = new Date(editingActivite.date_debut_prevue);
                            const ancienneDateFin = new Date(editingActivite.date_fin_prevue);
                            const dureeInitiale = ancienneDateFin.getTime() - ancienneDateDebut.getTime();
                            
                            const nouvelleDateDebut = new Date(dateDebut);
                            nouvelleDateDebut.setHours(0, 0, 0, 0);
                            const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeInitiale);
                            nouvelleDateFin.setHours(0, 0, 0, 0);
                            
                            setDateFinCalculee(nouvelleDateFin.toISOString().slice(0, 16));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="planifiee">Planifiée</option>
                        <option value="lancee">Lancée</option>
                        <option value="prolongee">Prolongée</option>
                        <option value="suspendue">Suspendue</option>
                        <option value="reportee">Reportée</option>
                        <option value="terminee">Terminée</option>
                        <option value="annulee">Annulée</option>
                      </select>
                    </div>
                    
                    {/* Motif de report - affiché uniquement si statut = "reportee" */}
                    {statutActivite === 'reportee' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Motif du report <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="motif_report"
                          value={motifReport}
                          onChange={(e) => setMotifReport(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Raison du report..."
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={editingActivite?.description || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Description détaillée de l'activité..."
                    />
                  </div>

                  {/* Section 6 : Hiérarchie */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Hiérarchie</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tâche parente (pour créer une sous-tâche)
                      </label>
                      <select
                        name="parent_id"
                        defaultValue={editingActivite?.parent_id || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="">Aucune (tâche principale)</option>
                        {activites
                          .filter((a) => a.affaire_id === (editingActivite?.affaire_id || filters.affaire))
                          .filter((a) => !editingActivite || a.id !== editingActivite.id)
                          .map((activite) => (
                            <option key={activite.id} value={activite.id}>
                              {activite.numero_hierarchique || "•"} {activite.libelle}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Section 7 : Dépendances multiples */}
                  <div className="border-t pt-4">
                    <DependancesManager
                      activiteId={editingActivite?.id}
                      activitesDisponibles={(() => {
                        // Déterminer l'affaire_id : priorité à editingActivite, puis selectedAffaireGantt, puis selectedAffaireId, puis filters.affaire
                        const affaireIdPourDependances = editingActivite?.affaire_id || selectedAffaireGantt || selectedAffaireId || filters.affaire;
                        
                        return activites
                          .filter((a) => {
                            // Filtrer par affaire si une affaire est spécifiée
                            if (affaireIdPourDependances) {
                              return a.affaire_id === affaireIdPourDependances;
                            }
                            // Sinon, afficher toutes les activités
                            return true;
                          })
                          .filter((a) => {
                            // Exclure l'activité en cours d'édition
                            if (editingActivite?.id) {
                              return a.id !== editingActivite.id;
                            }
                            return true;
                          })
                          // Ne pas filtrer par dates - permettre de créer des dépendances même sans dates
                          .map((a) => ({
                            id: a.id,
                            libelle: a.libelle,
                            numero_hierarchique: a.numero_hierarchique || undefined,
                          }));
                      })()}
                      dependancesInitiales={editingActivite?.id ? undefined : dependancesEnAttente.map((dep) => ({
                        activite_precedente_id: dep.activite_precedente_id,
                        type_dependance: dep.type_dependance,
                        delai_jours: dep.delai_jours,
                      }))}
                      onChange={(deps) => {
                        // Si l'activité n'a pas encore d'ID (création), stocker les dépendances en attente
                        if (!editingActivite?.id) {
                          setDependancesEnAttente(
                            deps
                              .filter((d) => d.activite_precedente_id && d.type_dependance)
                              .map((d) => ({
                                activite_precedente_id: d.activite_precedente_id,
                                type_dependance: d.type_dependance,
                                delai_jours: d.delai_jours || 0,
                              }))
                          );
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      // Mettre à jour les jalons avant de fermer le modal
                      const updatesJalons = mettreAJourJalons();
                      
                      if (updatesJalons.size > 0) {
                        // Mettre à jour les jalons dans l'état local
                        setJalonsLocaux(prev => prev.map(jalon => {
                          const update = updatesJalons.get(jalon.id);
                          if (update) {
                            return { ...jalon, date_debut_previsionnelle: update.date_debut_previsionnelle, date_fin_previsionnelle: update.date_fin_previsionnelle };
                          }
                          return jalon;
                        }));
                        
                        // Ajouter les jalons modifiés à la file d'attente
                        setPendingJalonsSaves(prev => {
                          const newMap = new Map(prev);
                          updatesJalons.forEach((update, jalonId) => {
                            newMap.set(jalonId, update);
                          });
                          return newMap;
                        });
                        
                        // Sauvegarder immédiatement les jalons
                        savePendingChanges();
                      }
                      
                      setShowActiviteModal(false);
                      setEditingActivite(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2"
                    disabled={saving}
                  >
                    {saving ? "Enregistrement..." : editingActivite ? "Modifier" : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

