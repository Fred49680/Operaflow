"use client";

import { useMemo } from "react";
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from "date-fns";
import GanttBar from "./GanttBar";
import type { ActivitePlanification } from "@/types/planification";

interface GanttGridProps {
  activites: ActivitePlanification[];
  dateDebut: Date;
  dateFin: Date;
  vue: "jour" | "semaine" | "mois";
  onActiviteClick?: (activite: ActivitePlanification) => void;
}

export default function GanttGrid({
  activites,
  dateDebut,
  dateFin,
  vue,
  onActiviteClick,
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
    <div className="relative overflow-x-auto">
      {/* Grille de fond avec lignes verticales */}
      <div className="relative" style={{ width: `${largeurTotale}px`, minHeight: `${activites.length * 48 + 16}px` }}>
        {/* Lignes verticales pour les colonnes */}
        <div className="absolute inset-0 flex">
          {colonnes.map((_, index) => (
            <div
              key={index}
              className="border-l border-gray-200 flex-1"
              style={{ minWidth: "120px" }}
            />
          ))}
        </div>

        {/* Lignes horizontales pour les activités */}
        <div className="absolute inset-0">
          {activites.map((activite, index) => (
            <div
              key={activite.id}
              className="absolute border-b border-gray-100"
              style={{
                top: `${index * 48 + 8}px`,
                left: 0,
                width: "100%",
                height: "40px",
              }}
            />
          ))}
        </div>

        {/* Barres d'activités */}
        <div className="absolute inset-0">
          {activites.map((activite, index) => (
            <div
              key={activite.id}
              className="absolute"
              style={{
                top: `${index * 48 + 8}px`,
                left: 0,
                width: "100%",
                height: "32px",
              }}
            >
              <GanttBar
                activite={activite}
                dateDebutTimeline={dateDebut}
                dateFinTimeline={dateFin}
                largeurTotale={largeurTotale}
                onClick={() => onActiviteClick?.(activite)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

