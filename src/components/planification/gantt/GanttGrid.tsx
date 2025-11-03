"use client";

import { useMemo } from "react";
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from "date-fns";
import GanttBar from "./GanttBar";
import GanttDependencies from "./GanttDependencies";
import type { ActivitePlanification, DependancePlanification } from "@/types/planification";

interface GanttGridProps {
  activites: ActivitePlanification[];
  dateDebut: Date;
  dateFin: Date;
  vue: "jour" | "semaine" | "mois";
  onActiviteClick?: (activite: ActivitePlanification) => void;
  onDragEnd?: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
  onResizeEnd?: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
}

export default function GanttGrid({
  activites,
  dateDebut,
  dateFin,
  vue,
  onActiviteClick,
  onDragEnd,
  onResizeEnd,
}: GanttGridProps) {
  // Calculer les colonnes selon la vue
  const colonnes = useMemo(() => {
    switch (vue) {
      case "jour":
        return eachDayOfInterval({ start: dateDebut, end: dateFin });
      case "semaine":
        return eachWeekOfInterval({ start: dateDebut, end: dateFin }, { weekStartsOn: 1 });
      case "mois":
        return eachMonthOfInterval({ start: dateDebut, end: dateFin });
      default:
        return eachDayOfInterval({ start: dateDebut, end: dateFin });
    }
  }, [dateDebut, dateFin, vue]);


  // Calculer la largeur totale de la grille
  const largeurTotale = useMemo(() => {
    return colonnes.length * 120; // 120px par colonne
  }, [colonnes.length]);

  return (
    <div 
      className="relative" 
      style={{ 
        width: `${largeurTotale}px`, 
        minHeight: `${activites.length * 48 + 16}px`,
        overflow: "visible"
      }}
    >
        {/* Lignes verticales pour les colonnes (semaines/mois/jours) */}
        <div className="absolute inset-0 flex">
          {colonnes.map((_, index) => (
            <div
              key={index}
              className="border-l border-gray-200 flex-1 relative"
              style={{ minWidth: "120px" }}
            >
              {/* Lignes verticales pour les jours dans la vue semaine */}
              {vue === "semaine" && (() => {
                const startWeek = startOfWeek(colonnes[index], { weekStartsOn: 1 });
                const jours = [];
                for (let i = 1; i < 7; i++) {
                  jours.push(i);
                }
                return jours.map((jourIndex) => {
                  const jourPosition = (jourIndex * 100) / 7;
                  const leftValue = `${jourPosition}%`;
                  return (
                    <div
                      key={jourIndex}
                      className="absolute top-0 bottom-0 border-l border-gray-100 border-dashed"
                      style={{ left: leftValue }}
                    />
                  );
                });
              })()}
            </div>
          ))}
        </div>

        {/* Lignes horizontales pour les activités */}
        <div className="absolute inset-0">
          {activites.map((activite, index) => {
            const niveau = activite.niveau_hierarchie || 0;
            const decalageVertical = niveau * 4;
            return (
              <div
                key={activite.id}
                className="absolute border-b border-gray-100"
                style={{
                  top: `${index * 48 + 8 + decalageVertical}px`,
                  left: 0,
                  width: "100%",
                  height: "40px",
                }}
              />
            );
          })}
        </div>

        {/* Lignes de dépendances (en arrière-plan) */}
        {(() => {
          const toutesDependances: DependancePlanification[] = activites.flatMap(
            (act) => act.dependances || []
          );
          return toutesDependances.length > 0 ? (
            <GanttDependencies
              activites={activites}
              dependances={toutesDependances}
              dateDebutTimeline={dateDebut}
              dateFinTimeline={dateFin}
              largeurTotale={largeurTotale}
              hauteurLigne={48}
            />
          ) : null;
        })()}

        {/* Barres d'activités */}
        <div className="absolute inset-0 z-10">
          {activites.map((activite, index) => {
            const niveau = activite.niveau_hierarchie || 0;
            const decalageVertical = niveau * 4;
            const decalageHorizontal = niveau * 10;
            const largeurBarre = largeurTotale - decalageHorizontal;
            const topPosition = index * 48 + 8 + decalageVertical;
            const leftPosition = decalageHorizontal;
            const widthCalc = `calc(100% - ${decalageHorizontal}px)`;
            
            return (
              <div
                key={activite.id}
                className="absolute"
                style={{
                  top: `${topPosition}px`,
                  left: `${leftPosition}px`,
                  width: widthCalc,
                  height: "32px",
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
          })}
        </div>
      </div>
    </div>
  );
}

