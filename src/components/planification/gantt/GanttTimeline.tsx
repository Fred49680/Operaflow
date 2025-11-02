"use client";

import { useMemo, useState } from "react";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import GanttHeader from "./GanttHeader";
import GanttGrid from "./GanttGrid";
import type { ActivitePlanification } from "@/types/planification";

interface GanttTimelineProps {
  activites: ActivitePlanification[];
  dateDebut?: Date;
  dateFin?: Date;
  vue?: "jour" | "semaine" | "mois";
  onActiviteClick?: (activite: ActivitePlanification) => void;
}

export default function GanttTimeline({
  activites,
  dateDebut: dateDebutProp,
  dateFin: dateFinProp,
  vue = "semaine",
  onActiviteClick,
}: GanttTimelineProps) {
  // Calculer la plage de dates si non fournie
  const { dateDebut, dateFin } = useMemo(() => {
    if (dateDebutProp && dateFinProp) {
      return {
        dateDebut: startOfDay(dateDebutProp),
        dateFin: endOfDay(dateFinProp),
      };
    }

    // Calculer automatiquement depuis les activités
    if (activites.length === 0) {
      const aujourdhui = new Date();
      return {
        dateDebut: startOfDay(subDays(aujourdhui, 7)),
        dateFin: endOfDay(addDays(aujourdhui, 30)),
      };
    }

    const dates = activites.flatMap((act) => [
      new Date(act.date_debut_prevue),
      new Date(act.date_fin_prevue),
    ]);

    const dateMin = new Date(Math.min(...dates.map((d) => d.getTime())));
    const dateMax = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Ajouter une marge de 7 jours avant et après
    return {
      dateDebut: startOfDay(subDays(dateMin, 7)),
      dateFin: endOfDay(addDays(dateMax, 7)),
    };
  }, [activites, dateDebutProp, dateFinProp]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* En-tête avec dates */}
      <GanttHeader dateDebut={dateDebut} dateFin={dateFin} vue={vue} />

      {/* Grille avec barres d'activités */}
      <div className="overflow-x-auto">
        <div className="flex">
          {/* Colonne fixe avec libellés des activités */}
          <div className="w-48 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
            {activites.map((activite, index) => (
              <div
                key={activite.id}
                className="h-12 p-3 border-b border-gray-100 flex items-center text-sm text-gray-700 font-medium"
              >
                <div className="truncate" title={activite.libelle}>
                  {activite.libelle}
                </div>
                {activite.affaire && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {activite.affaire.numero}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Zone de timeline scrollable */}
          <div className="flex-1">
            <GanttGrid
              activites={activites}
              dateDebut={dateDebut}
              dateFin={dateFin}
              vue={vue}
              onActiviteClick={onActiviteClick}
            />
          </div>
        </div>
      </div>

      {/* Légende des couleurs */}
      <div className="border-t border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="font-semibold">Légende :</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span>Jour</span>
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

