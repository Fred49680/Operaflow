"use client";

import { useMemo } from "react";
import type { ActivitePlanification } from "@/types/planification";

interface GanttBarProps {
  activite: ActivitePlanification;
  dateDebutTimeline: Date;
  dateFinTimeline: Date;
  largeurTotale: number;
  onClick?: () => void;
}

export default function GanttBar({
  activite,
  dateDebutTimeline,
  dateFinTimeline,
  largeurTotale,
  onClick,
}: GanttBarProps) {
  // Calculer la position et la largeur de la barre
  const { left, width } = useMemo(() => {
    const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
    const dateDebutActivite = new Date(activite.date_debut_prevue);
    const dateFinActivite = new Date(activite.date_fin_prevue);

    const debutBarre = dateDebutActivite.getTime() - dateDebutTimeline.getTime();
    const dureeBarre = dateFinActivite.getTime() - dateDebutActivite.getTime();

    return {
      left: Math.max(0, (debutBarre / dureeTotale) * largeurTotale),
      width: Math.max(20, (dureeBarre / dureeTotale) * largeurTotale), // Min 20px pour visibilité
    };
  }, [activite, dateDebutTimeline, dateFinTimeline, largeurTotale]);

  // Calculer la couleur selon statut/type horaire
  const couleur = useMemo(() => {
    if (activite.statut === "terminee") return "bg-green-500";
    if (activite.statut === "suspendue") return "bg-gray-400";
    if (activite.type_horaire === "nuit") return "bg-blue-500";
    if (activite.type_horaire === "weekend") return "bg-orange-500";
    if (activite.type_horaire === "ferie") return "bg-red-500";
    return "bg-indigo-500";
  }, [activite.statut, activite.type_horaire]);

  // Calculer le pourcentage d'avancement pour la barre de progression
  const pourcentageAvancement = activite.pourcentage_avancement || 0;

  return (
    <div
      className="relative h-8 group cursor-pointer"
      style={{ left: `${left}px`, width: `${width}px` }}
      onClick={onClick}
    >
      {/* Barre principale */}
      <div
        className={`${couleur} h-full rounded-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
      >
        {/* Barre de progression (partie complétée) */}
        {pourcentageAvancement > 0 && (
          <div
            className="absolute left-0 top-0 h-full bg-black bg-opacity-30 transition-all"
            style={{ width: `${pourcentageAvancement}%` }}
          />
        )}

        {/* Libellé de l'activité */}
        <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
          {activite.libelle}
        </div>
      </div>

      {/* Tooltip au survol */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
        <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg whitespace-nowrap">
          <div className="font-semibold">{activite.libelle}</div>
          <div className="text-gray-300 mt-1">
            {new Date(activite.date_debut_prevue).toLocaleDateString("fr-FR")} -{" "}
            {new Date(activite.date_fin_prevue).toLocaleDateString("fr-FR")}
          </div>
          <div className="text-gray-300">
            {activite.heures_prevues}h - {pourcentageAvancement}% complété
          </div>
          {activite.affaire && (
            <div className="text-gray-300">Affaire: {activite.affaire.numero}</div>
          )}
        </div>
      </div>
    </div>
  );
}

