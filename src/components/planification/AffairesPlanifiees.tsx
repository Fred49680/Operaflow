"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Eye, MapPin, User, TrendingUp } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffairesPlanifieesProps {
  onCreateActivite?: (affaireId: string) => void;
  onSelectAffaire?: (affaireId: string | null) => void;
  selectedAffaireId?: string | null;
}

export default function AffairesPlanifiees({ 
  onCreateActivite, 
  onSelectAffaire,
  selectedAffaireId 
}: AffairesPlanifieesProps) {
  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [activitesAffaires, setActivitesAffaires] = useState<Record<string, number>>({});
  const [avancementsAffaires, setAvancementsAffaires] = useState<Record<string, number>>({});
  const [statutsAffaires, setStatutsAffaires] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Rafraîchir toutes les 5 secondes pour détecter les nouvelles activités
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer les activités pour identifier les affaires avec activités
      const responseActivites = await fetch("/api/planification/activites");
      if (!responseActivites.ok) {
        throw new Error("Erreur lors de la récupération des activités");
      }
      
      const dataActivites = await responseActivites.json();
      const activites = dataActivites.activites || [];
      
      // Extraire les IDs uniques des affaires qui ont des activités
      const affaireIdsAvecActivites = new Set<string>();
      const counts: Record<string, number> = {};
      const avancements: Record<string, number[]> = {};
      const statuts: Record<string, string[]> = {};
      
      activites.forEach((act: any) => {
        if (act.affaire_id) {
          affaireIdsAvecActivites.add(act.affaire_id);
          counts[act.affaire_id] = (counts[act.affaire_id] || 0) + 1;
          
          // Collecter les pourcentages d'avancement
          if (!avancements[act.affaire_id]) {
            avancements[act.affaire_id] = [];
          }
          if (act.pourcentage_avancement) {
            avancements[act.affaire_id].push(parseFloat(act.pourcentage_avancement));
          }
          
          // Collecter les statuts
          if (!statuts[act.affaire_id]) {
            statuts[act.affaire_id] = [];
          }
          if (act.statut) {
            statuts[act.affaire_id].push(act.statut);
          }
        }
      });
      
      setActivitesAffaires(counts);
      
      // Calculer l'avancement moyen par affaire
      const avancementsMoyens: Record<string, number> = {};
      Object.keys(avancements).forEach((affaireId) => {
        const valeurs = avancements[affaireId];
        if (valeurs.length > 0) {
          avancementsMoyens[affaireId] = Math.round(
            valeurs.reduce((sum, val) => sum + val, 0) / valeurs.length
          );
        } else {
          avancementsMoyens[affaireId] = 0;
        }
      });
      setAvancementsAffaires(avancementsMoyens);
      
      // Déterminer le statut principal (priorité: terminee > lancee > planifiee)
      const statutsPriorises: Record<string, string> = {};
      Object.keys(statuts).forEach((affaireId) => {
        const statutsList = statuts[affaireId];
        if (statutsList.includes("terminee")) {
          statutsPriorises[affaireId] = "terminee";
        } else if (statutsList.includes("lancee")) {
          statutsPriorises[affaireId] = "lancee";
        } else if (statutsList.includes("planifiee")) {
          statutsPriorises[affaireId] = "planifiee";
        } else if (statutsList.includes("suspendue")) {
          statutsPriorises[affaireId] = "suspendue";
        } else {
          statutsPriorises[affaireId] = statutsList[0] || "planifiee";
        }
      });
      setStatutsAffaires(statutsPriorises);
      
      // Récupérer les affaires qui ont des activités (peu importe leur statut)
      if (affaireIdsAvecActivites.size > 0) {
        const affaireIdsArray = Array.from(affaireIdsAvecActivites);
        // Récupérer toutes les affaires (sans filtre de statut) puis filtrer par ID
        const responseAffaires = await fetch("/api/affaires");
        if (responseAffaires.ok) {
          const dataAffaires = await responseAffaires.json();
          // Filtrer pour ne garder que les affaires qui ont des activités
          const affairesAvecActivites = (dataAffaires.affaires || []).filter((affaire: Affaire) => 
            affaireIdsAvecActivites.has(affaire.id)
          );
          setAffaires(affairesAvecActivites);
        }
      } else {
        // Aucune activité, aucune affaire à afficher
        setAffaires([]);
      }
    } catch (error) {
      console.error("Erreur récupération affaires planifiées:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      </div>
    );
  }

  // Afficher toutes les affaires qui ont des activités (peu importe le statut de l'affaire)
  // Le statut de l'affaire peut être "planifie", "en_cours", etc., mais si elle a des activités,
  // elle doit être visible dans la planification
  const affairesPlanifiees = affaires;

  if (affairesPlanifiees.length === 0) {
    return null;
  }

  // Fonction pour obtenir la couleur de bordure selon le statut
  const getBorderColor = (affaireId: string) => {
    const statut = statutsAffaires[affaireId] || "planifiee";
    switch (statut) {
      case "terminee":
        return "border-green-500";
      case "lancee":
        return "border-blue-500";
      case "suspendue":
        return "border-gray-400";
      case "reportee":
        return "border-orange-500";
      default:
        return "border-blue-300";
    }
  };

  // Fonction pour obtenir la couleur de fond selon le statut
  const getBgColor = (affaireId: string) => {
    const statut = statutsAffaires[affaireId] || "planifiee";
    switch (statut) {
      case "terminee":
        return "bg-green-50";
      case "lancee":
        return "bg-blue-50";
      case "suspendue":
        return "bg-gray-50";
      case "reportee":
        return "bg-orange-50";
      default:
        return "bg-blue-50";
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-secondary">
            Affaires planifiées
          </h4>
          <p className="text-sm text-gray-600">
            {affairesPlanifiees.length} affaire{affairesPlanifiees.length > 1 ? "s" : ""} planifiée{affairesPlanifiees.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {affairesPlanifiees.map((affaire) => {
          const isSelected = selectedAffaireId === affaire.id;
          const avancement = avancementsAffaires[affaire.id] || 0;
          const statut = statutsAffaires[affaire.id] || "planifiee";
          
          return (
            <div
              key={affaire.id}
              onClick={() => onSelectAffaire?.(isSelected ? null : affaire.id)}
              className={`bg-white rounded-lg border-l-4 ${getBorderColor(affaire.id)} border-2 ${
                isSelected ? "border-primary shadow-lg ring-2 ring-primary" : "border-gray-200"
              } hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer ${getBgColor(affaire.id)}`}
            >
              <div className="p-4">
                {/* En-tête avec numéro */}
                <div className="mb-3">
                  <h5 className="text-base font-bold text-primary mb-1">
                    {affaire.numero}
                  </h5>
                  <h6 className="text-sm font-semibold text-secondary line-clamp-2">
                    {affaire.libelle}
                  </h6>
                </div>

                {/* Informations essentielles */}
                <div className="space-y-2 mb-3">
                  {affaire.site && (
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 truncate">
                        {typeof affaire.site === 'object' ? affaire.site.site_label : affaire.site}
                      </span>
                    </div>
                  )}
                  {affaire.charge_affaires && (
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 truncate">
                        {affaire.charge_affaires.prenom} {affaire.charge_affaires.nom}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pourcentage d'avancement */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Avancement
                    </span>
                    <span className="text-sm font-bold text-primary">{avancement}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        avancement >= 100
                          ? "bg-green-500"
                          : avancement >= 75
                          ? "bg-blue-500"
                          : avancement >= 50
                          ? "bg-yellow-500"
                          : avancement >= 25
                          ? "bg-orange-500"
                          : "bg-gray-400"
                      }`}
                      style={{ width: `${Math.min(avancement, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateActivite?.(affaire.id);
                    }}
                    className="flex-1 btn-primary bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-1 text-xs py-1.5"
                  >
                    <Plus className="h-3 w-3" />
                    Créer activité
                  </button>
                  <a
                    href={`/affaires/${affaire.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="btn-primary flex items-center justify-center gap-1 px-3 py-1.5 text-xs"
                  >
                    <Eye className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

