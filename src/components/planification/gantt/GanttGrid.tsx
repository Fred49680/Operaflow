"use client";

import { useMemo } from "react";
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek } from "date-fns";
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
    return colonnes.length * 140; // Augmenté de 120 à 140 pour plus d'espace
  }, [colonnes.length]);

  // Hauteur dynamique selon le nombre d'activités
  const hauteurTotale = useMemo(() => {
    return Math.max(400, activites.length * 80 + 24); // 80px par activité au lieu de 48px
  }, [activites.length]);

  return (
    <div className="relative overflow-x-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#CBD5E0 #F3F4F6" }}>
      <div 
        className="relative" 
        style={{ 
          width: String(largeurTotale) + "px", 
          minHeight: String(hauteurTotale) + "px",
          overflow: "visible"
        }}
      >
      {/* Lignes verticales pour les colonnes (semaines/mois/jours) */}
      <div className="absolute inset-0 flex">
        {colonnes.map((col, index) => {
          const isSemaine = vue === "semaine";
          return (
            <div
              key={index}
              className="border-l border-gray-200 flex-1 relative"
              style={{ minWidth: "140px" }}
            >
              {/* Lignes verticales pour les jours dans la vue semaine */}
              {isSemaine && (() => {
                const startWeek = startOfWeek(col, { weekStartsOn: 1 });
                const jours = [];
                for (let i = 1; i < 7; i++) {
                  jours.push(i);
                }
                return jours.map((jourIndex) => {
                  const jourPosition = (jourIndex * 100) / 7;
                  const leftValue = String(jourPosition) + "%";
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
          );
        })}
      </div>

      {/* Lignes horizontales pour les activités */}
      <div className="absolute inset-0">
        {activites.map((activite, index) => {
          const niveau = activite.niveau_hierarchie || 0;
          const decalageVertical = niveau * 6;
          const topValue = String(index * 80 + 12 + decalageVertical) + "px";
          return (
            <div
              key={activite.id}
              className="absolute border-b border-gray-100"
              style={{
                top: topValue,
                left: 0,
                width: "100%",
                height: "64px",
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
            hauteurLigne={80}
          />
        ) : null;
      })()}

      {/* Barres d'activités */}
      <div className="absolute inset-0 z-10">
        {activites
          .filter((activite) => activite.date_debut_prevue && activite.date_fin_prevue) // Filtrer les activités sans dates
          .map((activite, index) => {
            const niveau = activite.niveau_hierarchie || 0;
            const decalageVertical = niveau * 6;
            const decalageHorizontal = niveau * 12;
            const largeurBarre = largeurTotale - decalageHorizontal;
            // Top position: index * 80 (80px par activité) + petit décalage
            const topPosition = index * 80 + 12 + decalageVertical;
            const leftPosition = decalageHorizontal;
            const topValue = String(topPosition) + "px";
            const leftValue = String(leftPosition) + "px";
            const widthCalc = "calc(100% - " + String(decalageHorizontal) + "px)";
            
            return (
              <div
                key={activite.id}
                className="absolute"
                style={{
                  top: topValue,
                  left: leftValue,
                  width: widthCalc,
                  height: "56px",
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
