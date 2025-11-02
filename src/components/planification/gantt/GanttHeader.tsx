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

  return (
    <div className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
      <div className="flex">
        <div className="w-48 p-3 font-semibold text-gray-700 border-r border-gray-200">
          Activité
        </div>
        <div className="flex-1 flex">
          {colonnes.map((date, index) => (
            <div
              key={index}
              className="flex-1 p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0 min-w-[120px]"
            >
              {getLabel(date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

