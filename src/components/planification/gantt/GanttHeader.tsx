"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { getJoursOuvres, isJourOuvre } from "@/utils/gantt-calendar";

interface GanttHeaderProps {
  dateDebut: Date;
  dateFin: Date;
  vue: "jour" | "semaine" | "mois";
}

export default function GanttHeader({ dateDebut, dateFin, vue }: GanttHeaderProps) {
  const colonnes = useMemo(() => {
    switch (vue) {
      case "jour":
        // Filtrer pour n'afficher que les jours ouvrés (lundi-vendredi)
        const tousJours = eachDayOfInterval({ start: dateDebut, end: dateFin });
        return tousJours.filter(jour => isJourOuvre(jour));
      case "semaine":
        return eachWeekOfInterval({ start: dateDebut, end: dateFin }, { weekStartsOn: 1 });
      case "mois":
        return eachMonthOfInterval({ start: dateDebut, end: dateFin });
      default:
        const tousJoursDefault = eachDayOfInterval({ start: dateDebut, end: dateFin });
        return tousJoursDefault.filter(jour => isJourOuvre(jour));
    }
  }, [dateDebut, dateFin, vue]);

  const getLabel = (date: Date) => {
    switch (vue) {
      case "jour":
        return format(date, "dd MMM");
      case "semaine":
        const debut = startOfWeek(date, { weekStartsOn: 1 });
        const fin = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(debut, "dd MMM")} - ${format(fin, "dd MMM")}`;
      case "mois":
        return format(date, "MMMM yyyy");
      default:
        return format(date, "dd MMM");
    }
  };

  // Calculer les jours pour afficher dans la vue semaine (uniquement jours ouvrés)
  const joursSemaine = useMemo(() => {
    if (vue === "semaine") {
      return colonnes.map((semaine) => {
        const startWeek = startOfWeek(semaine, { weekStartsOn: 1 });
        const jours = [];
        // Afficher seulement les jours ouvrés (lundi-vendredi = jours 1-5)
        for (let i = 1; i <= 5; i++) {
          const jour = new Date(startWeek);
          jour.setDate(startWeek.getDate() + i - 1); // -1 car lundi = 1 dans startOfWeek
          jours.push(jour);
        }
        return jours;
      });
    }
    return [];
  }, [vue, colonnes]);

  return (
    <div className="border-b border-gray-200 bg-gray-50 sticky top-0 z-30">
      <div className="flex">
        <div 
          className="px-4 py-3 font-semibold text-gray-700 border-r border-gray-200 text-base flex-shrink-0" 
          style={{ 
            zIndex: 31,
            width: "288px", // Exactement la même largeur que la colonne fixe (w-72 = 18rem = 288px)
            minWidth: "288px",
            maxWidth: "288px"
          }}
        >
          Activité
        </div>
        <div className="flex-1 flex">
          {colonnes.map((date, index) => (
            <div
              key={index}
              className="flex-1 px-2 py-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0 min-w-[140px] relative flex flex-col"
            >
              {/* Label de la semaine/mois/jour */}
              <div className="mb-2">
                {getLabel(date)}
              </div>
              {/* Afficher les jours dans la vue semaine (uniquement jours ouvrés) */}
              {vue === "semaine" && joursSemaine[index] && (
                <div className="flex border-t border-gray-200 pt-1 mt-auto">
                  {joursSemaine[index].map((jour, jourIndex) => (
                    <div
                      key={jourIndex}
                      className="flex-1 text-xs text-gray-500 py-0.5 border-r border-gray-200 last:border-r-0 text-center"
                      style={{ minWidth: `${100 / 5}%` }}
                    >
                      {format(jour, "dd")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

