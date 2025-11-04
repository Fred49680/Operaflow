"use client";

import { useMemo } from "react";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import GanttHeader from "./GanttHeader";
import GanttGrid from "./GanttGrid";
import GanttJalonBar from "./GanttJalonBar";
import GanttBar from "./GanttBar";
import type { ActivitePlanification } from "@/types/planification";

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

interface GanttTimelineProps {
  activites: ActivitePlanification[];
  jalons?: JalonGantt[];
  dateDebut?: Date;
  dateFin?: Date;
  vue?: "jour" | "semaine" | "mois";
  onActiviteClick?: (activite: ActivitePlanification) => void;
  onJalonClick?: (jalon: JalonGantt) => void;
  onDragEnd?: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
  onResizeEnd?: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
}

interface GanttItem {
  type: "jalon" | "activite";
  jalon?: JalonGantt;
  activite?: ActivitePlanification;
  top: number; // Position verticale dans la timeline
  height: number; // Hauteur de la ligne
}

export default function GanttTimeline({
  activites = [],
  jalons = [],
  dateDebut: dateDebutProp,
  dateFin: dateFinProp,
  vue = "semaine",
  onActiviteClick,
  onJalonClick,
  onDragEnd,
  onResizeEnd,
}: GanttTimelineProps) {
  // Calculer la plage de dates si non fournie (incluant les jalons)
  const { dateDebut, dateFin } = useMemo(() => {
    if (dateDebutProp && dateFinProp) {
      return {
        dateDebut: startOfDay(dateDebutProp),
        dateFin: endOfDay(dateFinProp),
      };
    }

    // Calculer automatiquement depuis les activités et jalons
    const toutesDates: Date[] = [];
    
    activites.forEach((act) => {
      toutesDates.push(new Date(act.date_debut_prevue), new Date(act.date_fin_prevue));
    });

    jalons.forEach((jalon) => {
      if (jalon.date_debut_previsionnelle) {
        toutesDates.push(new Date(jalon.date_debut_previsionnelle));
      }
      if (jalon.date_fin_previsionnelle) {
        toutesDates.push(new Date(jalon.date_fin_previsionnelle));
      }
    });

    if (toutesDates.length === 0) {
      const aujourdhui = new Date();
      return {
        dateDebut: startOfDay(subDays(aujourdhui, 7)),
        dateFin: endOfDay(addDays(aujourdhui, 30)),
      };
    }

    const dateMin = new Date(Math.min(...toutesDates.map((d) => d.getTime())));
    const dateMax = new Date(Math.max(...toutesDates.map((d) => d.getTime())));

    // Ajouter une marge de 7 jours avant et après
    return {
      dateDebut: startOfDay(subDays(dateMin, 7)),
      dateFin: endOfDay(addDays(dateMax, 7)),
    };
  }, [activites, jalons, dateDebutProp, dateFinProp]);

  // Calculer la largeur totale de la grille
  const largeurTotale = useMemo(() => {
    const dureeTotale = dateFin.getTime() - dateDebut.getTime();
    const jours = Math.ceil(dureeTotale / (1000 * 60 * 60 * 24));
    switch (vue) {
      case "jour":
        return jours * 140;
      case "semaine":
        return Math.ceil(jours / 7) * 140;
      case "mois":
        return Math.ceil(jours / 30) * 140;
      default:
        return jours * 140;
    }
  }, [dateDebut, dateFin, vue]);

  // ÉTAPE 1: Grouper les activités par lot_id (jalon)
  const activitesParJalon = useMemo(() => {
    const map = new Map<string, ActivitePlanification[]>();
    
    // Ajouter les activités sans jalon dans un groupe spécial
    const activitesSansJalon: ActivitePlanification[] = [];
    
    activites.forEach((activite) => {
      // Filtrer uniquement les activités avec dates
      if (!activite.date_debut_prevue || !activite.date_fin_prevue) {
        return; // Ignorer les activités sans dates
      }
      
      // Vérifier si cette activité est liée à un jalon (lot avec est_jalon_gantt = true)
      const jalonAssocie = jalons.find(j => j.id === activite.lot_id);
      
      if (jalonAssocie) {
        // Activité liée à un jalon
        if (!map.has(activite.lot_id)) {
          map.set(activite.lot_id, []);
        }
        map.get(activite.lot_id)!.push(activite);
      } else if (activite.lot_id) {
        // Activité liée à un lot mais pas un jalon -> on l'ignore ou on la met dans sans jalon
        // On peut choisir de les afficher ou non
      } else {
        // Activité sans jalon
        activitesSansJalon.push(activite);
      }
    });
    
    return { map, activitesSansJalon };
  }, [activites]);

  // ÉTAPE 2: Créer la liste ordonnée des items (jalons + leurs activités)
  const itemsGantt: GanttItem[] = useMemo(() => {
    const items: GanttItem[] = [];
    let currentTop = 0;
    const hauteurJalon = 40; // 40px par jalon
    const hauteurActivite = 80; // 80px par activité
    
    // Trier les jalons par date
    const jalonsTries = [...jalons].sort((a, b) => {
      const dateA = a.date_debut_previsionnelle || a.date_fin_previsionnelle || "";
      const dateB = b.date_debut_previsionnelle || b.date_fin_previsionnelle || "";
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    
    // Pour chaque jalon, ajouter le jalon puis ses activités
    jalonsTries.forEach((jalon) => {
      // Ajouter le jalon
      items.push({
        type: "jalon",
        jalon,
        top: currentTop,
        height: hauteurJalon,
      });
      currentTop += hauteurJalon;
      
      // Ajouter les activités de ce jalon (triées par date de début)
      const activitesJalon = (activitesParJalon.map.get(jalon.id) || [])
        .filter(act => act.date_debut_prevue && act.date_fin_prevue) // S'assurer que les dates existent
        .sort((a, b) => new Date(a.date_debut_prevue).getTime() - new Date(b.date_debut_prevue).getTime());
      
      activitesJalon.forEach((activite) => {
        items.push({
          type: "activite",
          activite,
          top: currentTop,
          height: hauteurActivite,
        });
        currentTop += hauteurActivite;
      });
    });
    
    // Ajouter les activités sans jalon à la fin (triées par date de début)
    activitesParJalon.activitesSansJalon
      .filter(act => act.date_debut_prevue && act.date_fin_prevue) // S'assurer que les dates existent
      .sort((a, b) => new Date(a.date_debut_prevue).getTime() - new Date(b.date_debut_prevue).getTime())
      .forEach((activite) => {
        items.push({
          type: "activite",
          activite,
          top: currentTop,
          height: hauteurActivite,
        });
        currentTop += hauteurActivite;
      });
    
    return items;
  }, [jalons, activitesParJalon]);

  // Calculer la hauteur totale
  const hauteurTotale = useMemo(() => {
    if (itemsGantt.length === 0) return 400;
    const dernierItem = itemsGantt[itemsGantt.length - 1];
    return dernierItem.top + dernierItem.height + 48; // +48px pour l'en-tête
  }, [itemsGantt]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* En-tête avec dates */}
      <GanttHeader dateDebut={dateDebut} dateFin={dateFin} vue={vue} />

      {/* Grille avec barres d'activités */}
      <div 
        className="overflow-x-auto overflow-y-auto" 
        style={{ 
          maxHeight: "calc(100vh - 300px)",
          minHeight: `${hauteurTotale}px`
        }}
      >
        <div className="flex">
          {/* Colonne fixe avec libellés */}
          <div className="w-72 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
            {/* Liste des items (jalons + activités) - position absolue pour alignement parfait avec la timeline */}
            <div className="relative" style={{ minHeight: `${itemsGantt.length > 0 ? itemsGantt[itemsGantt.length - 1].top + itemsGantt[itemsGantt.length - 1].height : 0}px`, paddingTop: "48px" }}>
              {itemsGantt.map((item, index) => {
                if (item.type === "jalon") {
                  return (
                    <div
                      key={`jalon-${item.jalon!.id}`}
                      className="absolute left-0 right-0 px-4 py-3 border-b border-purple-100 flex items-center text-sm text-purple-700 font-semibold bg-purple-50"
                      style={{ 
                        top: `${item.top}px`,
                        height: `${item.height}px` 
                      }}
                    >
                      <div className="flex items-center gap-3 truncate w-full">
                        <span className="text-purple-500 text-lg flex-shrink-0">◇</span>
                        <span className="truncate flex-1">{item.jalon!.libelle_lot}</span>
                      </div>
                    </div>
                  );
                } else {
                  const activite = item.activite!;
                  const niveau = activite.niveau_hierarchie || 0;
                  const indent = niveau * 24;
                  return (
                    <div
                      key={`activite-${activite.id}`}
                      className="absolute left-0 right-0 px-4 py-4 border-b border-gray-100 flex items-center text-sm text-gray-700 font-medium"
                      style={{ 
                        top: `${item.top}px`,
                        height: `${item.height}px` 
                      }}
                    >
                      <div 
                        className="flex items-center gap-3 truncate w-full" 
                        title={activite.libelle}
                        style={{ paddingLeft: `${indent}px` }}
                      >
                        {activite.numero_hierarchique && (
                          <span className="text-sm font-bold text-primary flex-shrink-0">
                            {activite.numero_hierarchique}
                          </span>
                        )}
                        <span className="truncate flex-1 text-sm">{activite.libelle}</span>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* Zone scrollable avec timeline */}
          <div className="flex-1 relative" style={{ minWidth: `${largeurTotale}px` }}>
            {/* Grille de fond */}
            <GanttGrid
              activites={[]}
              dateDebut={dateDebut}
              dateFin={dateFin}
              vue={vue}
              onActiviteClick={onActiviteClick}
              onDragEnd={onDragEnd}
              onResizeEnd={onResizeEnd}
            />
            
            {/* Couche des jalons et activités */}
            <div className="absolute inset-0 z-20" style={{ paddingTop: "48px" }}>
              {itemsGantt.map((item) => {
                if (item.type === "jalon") {
                  // Décalage vertical pour centrer la barre (hauteur ligne 40px - hauteur barre 32px = 8px / 2 = 4px)
                  const decalageVertical = (item.height - 32) / 2;
                  return (
                    <div
                      key={`jalon-timeline-${item.jalon!.id}`}
                      className="absolute flex items-center"
                      style={{
                        top: `${item.top + decalageVertical}px`,
                        left: 0,
                        width: "100%",
                        height: `${item.height}px`,
                      }}
                    >
                      <GanttJalonBar
                        jalon={item.jalon!}
                        dateDebutTimeline={dateDebut}
                        dateFinTimeline={dateFin}
                        largeurTotale={largeurTotale}
                        onClick={() => onJalonClick?.(item.jalon!)}
                      />
                    </div>
                  );
                } else {
                  const activite = item.activite!;
                  if (!activite.date_debut_prevue || !activite.date_fin_prevue) return null;
                  
                  const niveau = activite.niveau_hierarchie || 0;
                  const decalageHorizontal = niveau * 12;
                  const largeurBarre = largeurTotale - decalageHorizontal;
                  // Décalage vertical pour centrer la barre (hauteur ligne 80px - hauteur barre 56px = 24px / 2 = 12px)
                  const decalageVertical = (item.height - 56) / 2;
                  
                  return (
                    <div
                      key={`activite-timeline-${activite.id}`}
                      className="absolute"
                      style={{
                        top: `${item.top + decalageVertical}px`,
                        left: `${decalageHorizontal}px`,
                        width: `calc(100% - ${decalageHorizontal}px)`,
                        height: `${item.height}px`,
                      }}
                    >
                      <GanttBar
                        activite={activite}
                        dateDebutTimeline={dateDebut}
                        dateFinTimeline={dateFin}
                        largeurTotale={largeurBarre}
                        onClick={() => onActiviteClick?.(activite)}
                        onDragEnd={onDragEnd}
                        onResizeEnd={onResizeEnd}
                      />
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Légende des couleurs */}
      <div className="border-t border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
          <span className="font-semibold">Légende :</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-purple-500 border-2 border-purple-600 rounded"></div>
            <span>Jalon</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span>Jour (HN 5/7)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Nuit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Week-end</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Férié</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>3x8</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Accéléré</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Terminée</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Suspendue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
