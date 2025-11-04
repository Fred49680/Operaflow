"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from "date-fns";

interface GanttHeaderProps {
  dateDebut: Date;
  dateFin: Date;
  vue: "jour" | "semaine" | "mois";
}

export default function GanttHeader({ dateDebut, dateFin, vue }: GanttHeaderProps) {
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

  // Calculer les jours pour afficher dans la vue semaine
  const joursSemaine = useMemo(() => {
    if (vue === "semaine") {
      return colonnes.map((semaine) => {
        const startWeek = startOfWeek(semaine, { weekStartsOn: 1 });
        const jours = [];
        for (let i = 0; i < 7; i++) {
          const jour = new Date(startWeek);
          jour.setDate(startWeek.getDate() + i);
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
        <div className="w-72 px-4 py-3 font-semibold text-gray-700 border-r border-gray-200 text-base" style={{ zIndex: 31 }}>
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
              {/* Afficher les jours dans la vue semaine */}
              {vue === "semaine" && joursSemaine[index] && (
                <div className="flex border-t border-gray-200 pt-1 mt-auto">
                  {joursSemaine[index].map((jour, jourIndex) => (
                    <div
                      key={jourIndex}
                      className="flex-1 text-xs text-gray-500 py-0.5 border-r border-gray-200 last:border-r-0 text-center"
                      style={{ minWidth: `${100 / 7}%` }}
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

