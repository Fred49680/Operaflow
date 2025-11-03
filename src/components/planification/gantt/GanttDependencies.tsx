"use client";

import { useMemo } from "react";
import type { ActivitePlanification, DependancePlanification } from "@/types/planification";

interface GanttDependenciesProps {
  activites: ActivitePlanification[];
  dependances: DependancePlanification[];
  dateDebutTimeline: Date;
  dateFinTimeline: Date;
  largeurTotale: number;
  hauteurLigne: number; // Hauteur d'une ligne d'activité dans le Gantt
}

export default function GanttDependencies({
  activites,
  dependances,
  dateDebutTimeline,
  dateFinTimeline,
  largeurTotale,
  hauteurLigne = 48, // 48px par ligne par défaut
}: GanttDependenciesProps) {
  // Créer une map pour accéder rapidement aux positions des activités
  const activitePositions = useMemo(() => {
    const positions: Map<string, { left: number; centerY: number; index: number }> = new Map();
    
    activites.forEach((act, index) => {
      const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
      const dateDebutActivite = new Date(act.date_debut_prevue);
      const dateFinActivite = new Date(act.date_fin_prevue);

      const debutBarre = dateDebutActivite.getTime() - dateDebutTimeline.getTime();
      const dureeBarre = dateFinActivite.getTime() - dateDebutActivite.getTime();

      const left = Math.max(0, (debutBarre / dureeTotale) * largeurTotale);
      const width = Math.max(20, (dureeBarre / dureeTotale) * largeurTotale);
      const centerX = left + width / 2;
      const centerY = index * hauteurLigne + hauteurLigne / 2;

      positions.set(act.id, { left: centerX, centerY, index });
    });

    return positions;
  }, [activites, dateDebutTimeline, dateFinTimeline, largeurTotale, hauteurLigne]);

  // Calculer les lignes de connexion pour chaque dépendance
  const lignesConnexion = useMemo(() => {
    return dependances
      .map((dep) => {
        const activitePrecedente = activites.find((a) => a.id === dep.activite_precedente_id);
        const activiteSuivante = activites.find((a) => a.id === dep.activite_id);

        if (!activitePrecedente || !activiteSuivante) return null;

        const posPrecedente = activitePositions.get(dep.activite_precedente_id);
        const posSuivante = activitePositions.get(dep.activite_id);

        if (!posPrecedente || !posSuivante) return null;

        // Coordonnées de départ (fin de l'activité précédente)
        const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
        const dateFinPrecedente = new Date(activitePrecedente.date_fin_prevue);
        const dateDebutSuivante = new Date(activiteSuivante.date_debut_prevue);
        
        const finPrecedente = dateFinPrecedente.getTime() - dateDebutTimeline.getTime();
        const debutSuivante = dateDebutSuivante.getTime() - dateDebutTimeline.getTime();
        
        const x1 = Math.max(0, (finPrecedente / dureeTotale) * largeurTotale);
        const x2 = Math.max(0, (debutSuivante / dureeTotale) * largeurTotale);
        const y1 = posPrecedente.centerY;
        const y2 = posSuivante.centerY;

        // Couleur selon le type de dépendance
        const couleurs: Record<string, string> = {
          FS: "stroke-blue-500", // Finish-to-Start
          SS: "stroke-green-500", // Start-to-Start
          FF: "stroke-purple-500", // Finish-to-Finish
          SF: "stroke-orange-500", // Start-to-Finish
        };

        return {
          id: dep.id,
          x1,
          y1,
          x2,
          y2,
          type: dep.type_dependance,
          couleur: couleurs[dep.type_dependance] || "stroke-gray-500",
          delai: dep.delai_jours,
        };
      })
      .filter((ligne): ligne is NonNullable<typeof ligne> => ligne !== null);
  }, [dependances, activites, activitePositions, dateDebutTimeline, dateFinTimeline, largeurTotale]);

  if (lignesConnexion.length === 0) {
    return null;
  }

  return (
    <svg
      className="absolute pointer-events-none z-0"
      style={{ 
        left: 0,
        top: 0,
        width: `${largeurTotale}px`,
        height: `${activites.length * hauteurLigne}px`
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
        </marker>
      </defs>
      
      {lignesConnexion.map((ligne) => {
        // Calculer le chemin avec une courbe si les activités ne sont pas alignées
        const deltaY = ligne.y2 - ligne.y1;
        const controlPointX = ligne.x1 + (ligne.x2 - ligne.x1) / 2;
        const controlPointY1 = ligne.y1;
        const controlPointY2 = ligne.y2;

        // Si les activités sont sur la même ligne ou très proches, ligne droite
        const distance = Math.abs(deltaY);
        const useCurve = distance > 50; // Utiliser une courbe si écart > 50px

        const pathData = useCurve
          ? `M ${ligne.x1} ${ligne.y1} C ${controlPointX} ${controlPointY1}, ${controlPointX} ${controlPointY2}, ${ligne.x2} ${ligne.y2}`
          : `M ${ligne.x1} ${ligne.y1} L ${ligne.x2} ${ligne.y2}`;

        return (
          <g key={ligne.id}>
            {/* Ligne de connexion */}
            <path
              d={pathData}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className={ligne.couleur}
              markerEnd="url(#arrowhead)"
              opacity="0.6"
            />
            {/* Label du type de dépendance au milieu */}
            <text
              x={controlPointX}
              y={(ligne.y1 + ligne.y2) / 2 - 5}
              className={`text-[10px] font-bold ${ligne.couleur.replace("stroke-", "fill-")}`}
              textAnchor="middle"
            >
              {ligne.type}
              {ligne.delai > 0 && ` +${ligne.delai}j`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

