"use client";

import { useMemo, useState } from "react";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import GanttHeader from "./GanttHeader";
import GanttGrid from "./GanttGrid";
import GanttJalonBar from "./GanttJalonBar";
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

export default function GanttTimeline({
  activites,
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

  // Calculer la largeur totale de la grille (similaire à GanttGrid)
  const largeurTotale = useMemo(() => {
    const dureeTotale = dateFin.getTime() - dateDebut.getTime();
    const jours = Math.ceil(dureeTotale / (1000 * 60 * 60 * 24));
    switch (vue) {
      case "jour":
        return jours * 120;
      case "semaine":
        return Math.ceil(jours / 7) * 120;
      case "mois":
        return Math.ceil(jours / 30) * 120;
      default:
        return jours * 120;
    }
  }, [dateDebut, dateFin, vue]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* En-tête avec dates */}
      <GanttHeader dateDebut={dateDebut} dateFin={dateFin} vue={vue} />

      {/* Grille avec barres d'activités */}
      <div 
        className="overflow-x-auto overflow-y-auto" 
        style={{ 
          maxHeight: "calc(100vh - 300px)",
          minHeight: `${Math.max(400, (activites.length * 80 + jalons.length * 40 + 120))}px`
        }}
      >
        <div className="flex">
          {/* Colonne fixe avec libellés des activités et jalons */}
          <div className="w-72 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
            {/* Section Jalons */}
            {jalons.length > 0 && (
              <>
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
                  <div className="text-sm font-bold text-purple-700 uppercase">Jalons</div>
                </div>
                {jalons.map((jalon) => (
                  <div
                    key={jalon.id}
                    className="h-10 py-3 px-4 border-b border-purple-100 flex items-center text-sm text-purple-700 font-semibold"
                  >
                    <div className="flex items-center gap-3 truncate w-full">
                      <span className="text-purple-500 text-lg">◇</span>
                      <span className="truncate flex-1">{jalon.libelle_lot}</span>
                    </div>
                    {jalon.affaire && (
                      <div className="text-xs text-purple-400 ml-auto">
                        {jalon.affaire.numero}
                      </div>
                    )}
                  </div>
                ))}
                <div className="h-3 border-b-2 border-gray-300"></div>
              </>
            )}
            
            {/* Section Activités */}
            <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="text-sm font-bold text-gray-700 uppercase">Activités</div>
            </div>
            {activites.map((activite, index) => {
              const niveau = activite.niveau_hierarchie || 0;
              const indent = niveau * 24; // 24px par niveau
              return (
                <div
                  key={activite.id}
                  className="h-20 py-4 px-4 border-b border-gray-100 flex items-center text-sm text-gray-700 font-medium"
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
                  {activite.affaire && (
                    <div className="text-xs text-gray-500 mt-0.5 ml-auto">
                      {activite.affaire.numero}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zone scrollable avec timeline */}
          <div className="flex-1 relative" style={{ minWidth: `${largeurTotale}px` }}>
            {/* Couche des jalons */}
            {jalons.length > 0 && (
              <div className="absolute inset-0 z-20" style={{ paddingTop: "48px" }}>
                {jalons.map((jalon, index) => (
                  <div
                    key={jalon.id}
                    className="absolute"
                    style={{
                      top: `${index * 40}px`,
                      left: 0,
                      width: "100%",
                      height: "40px",
                    }}
                  >
                    <GanttJalonBar
                      jalon={jalon}
                      dateDebutTimeline={dateDebut}
                      dateFinTimeline={dateFin}
                      largeurTotale={largeurTotale}
                      onClick={() => onJalonClick?.(jalon)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Couche des activités */}
            <div style={{ paddingTop: jalons.length > 0 ? `${jalons.length * 40 + 12}px` : "48px" }}>
              <GanttGrid
                activites={activites}
                dateDebut={dateDebut}
                dateFin={dateFin}
                vue={vue}
                onActiviteClick={onActiviteClick}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
              />
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

