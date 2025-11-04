"use client";

import { useMemo, useCallback } from "react";
import { useGanttDrag } from "./useGanttDrag";
import { useGanttResize } from "./useGanttResize";
import type { ActivitePlanification } from "@/types/planification";

interface GanttBarProps {
  activite: ActivitePlanification;
  dateDebutTimeline: Date;
  dateFinTimeline: Date;
  largeurTotale: number;
  onClick?: () => void;
  onDragEnd?: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
  onResizeEnd?: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
}

export default function GanttBar({
  activite,
  dateDebutTimeline,
  dateFinTimeline,
  largeurTotale,
  onClick,
  onDragEnd,
  onResizeEnd,
}: GanttBarProps) {
  // Hook de drag & drop
  const drag = useGanttDrag({
    activite,
    dateDebutTimeline,
    dateFinTimeline,
    largeurTotale,
    onDragEnd: onDragEnd || (() => {}),
  });

  // Hook de redimensionnement
  const resize = useGanttResize({
    activite,
    dateDebutTimeline,
    dateFinTimeline,
    largeurTotale,
    onResizeEnd: onResizeEnd || (() => {}),
  });

  // Calculer la position et la largeur de la barre
  const { left, width } = useMemo(() => {
    if (resize.isResizing) {
      // Pendant le resize, utiliser les dates mises à jour du hook
      const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
      const dateDebut = resize.initialDateDebut;
      const dateFin = resize.initialDateFin;

      const debutBarre = dateDebut.getTime() - dateDebutTimeline.getTime();
      const dureeBarre = dateFin.getTime() - dateDebut.getTime();

      if (dureeTotale <= 0 || isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
        return { left: 0, width: 0 };
      }

      return {
        left: Math.max(0, (debutBarre / dureeTotale) * largeurTotale),
        width: Math.max(20, (dureeBarre / dureeTotale) * largeurTotale),
      };
    }

    if (drag.isDragging) {
      // Pendant le drag, utiliser la position calculée par le hook
      return {
        left: drag.currentLeft,
        width: drag.width,
      };
    }

    if (!activite.date_debut_prevue || !activite.date_fin_prevue) {
      // Si pas de dates, ne pas afficher
      return { left: 0, width: 0 };
    }

    const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
    const dateDebutActivite = new Date(activite.date_debut_prevue);
    const dateFinActivite = new Date(activite.date_fin_prevue);

    const debutBarre = dateDebutActivite.getTime() - dateDebutTimeline.getTime();
    const dureeBarre = dateFinActivite.getTime() - dateDebutActivite.getTime();

    // Vérifier que les dates sont valides
    if (isNaN(dateDebutActivite.getTime()) || isNaN(dateFinActivite.getTime()) || dureeTotale <= 0) {
      return { left: 0, width: 0 };
    }

    return {
      left: Math.max(0, (debutBarre / dureeTotale) * largeurTotale),
      width: Math.max(20, (dureeBarre / dureeTotale) * largeurTotale), // Min 20px pour visibilité
    };
  }, [activite, dateDebutTimeline, dateFinTimeline, largeurTotale, drag, resize]);

  // Calculer la couleur selon statut/type horaire
  const couleur = useMemo(() => {
    if (activite.statut === "terminee") return "bg-green-500";
    if (activite.statut === "suspendue") return "bg-gray-400";
    if (activite.type_horaire === "nuit") return "bg-blue-500";
    if (activite.type_horaire === "weekend") return "bg-orange-500";
    if (activite.type_horaire === "ferie") return "bg-red-500";
    if (activite.type_horaire === "3x8") return "bg-purple-500";
    if (activite.type_horaire === "accelerer") return "bg-yellow-500";
    return "bg-indigo-500"; // jour par défaut (HN 5/7)
  }, [activite.statut, activite.type_horaire]);

  // Calculer le pourcentage d'avancement pour la barre de progression
  const pourcentageAvancement = activite.pourcentage_avancement || 0;

  // Gérer le clic pour modifier (si pas de drag en cours)
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ne pas déclencher le clic si on clique sur un handle de redimensionnement
    if ((e.target as HTMLElement).closest(".gantt-bar-handle")) {
      return;
    }
    // Ne pas déclencher le clic si on vient de faire un drag ou un resize
    // On vérifie aussi si le mouvement était significatif (> 5px)
    if (drag.isDragging || drag.hasJustDragged || resize.isResizing || resize.hasJustResized) {
      return;
    }
    onClick?.();
  }, [drag.isDragging, drag.hasJustDragged, resize.isResizing, resize.hasJustResized, onClick]);

  // Vérifier si le drag est autorisé selon le statut
  const statutsBloquesDrag = ['lancee', 'prolongee', 'suspendue', 'terminee'];
  const canDrag = onDragEnd && !statutsBloquesDrag.includes(activite.statut);
  
  return (
    <div
      className={`relative h-8 group ${drag.isDragging || resize.isResizing ? "cursor-grabbing z-30" : canDrag || onResizeEnd ? "cursor-grab" : "cursor-pointer"}`}
      style={{ left: `${left}px`, width: `${width}px` }}
      onMouseDown={canDrag ? drag.onMouseDown : undefined}
      onClick={(e) => {
        // Si onDragEnd est défini, on permet le drag mais on gère aussi le clic
        // Le handleClick vérifiera si c'est vraiment un clic (pas un drag)
        if (!drag.isDragging && !resize.isResizing) {
          handleClick(e);
        }
      }}
    >
      {/* Barre principale */}
      <div
        className={`${couleur} h-full rounded-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${drag.isDragging || resize.isResizing ? "opacity-80 shadow-lg" : ""}`}
      >
        {/* Barre de progression (partie complétée) - basée sur déclarations d'avancement chantier */}
        {pourcentageAvancement > 0 && pourcentageAvancement < 100 && (
          <div
            className="absolute left-0 top-0 h-full bg-black bg-opacity-40 transition-all duration-300 z-10"
            style={{ width: `${Math.min(pourcentageAvancement, 100)}%` }}
          />
        )}
        
        {/* Barre 100% complète (fond différent) */}
        {pourcentageAvancement >= 100 && (
          <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-green-600 to-green-500 opacity-80 z-10" />
        )}
        
        {/* Indicateur de progression en pourcentage */}
        {pourcentageAvancement > 0 && (
          <div className="absolute right-2 top-1 text-xs font-bold text-white drop-shadow-md z-20">
            {Math.round(pourcentageAvancement)}%
          </div>
        )}

        {/* Libellé de l'activité */}
        <div className="absolute inset-0 flex items-center px-3 text-sm font-medium text-white truncate">
          {activite.libelle}
        </div>

        {/* Handles de redimensionnement */}
        {onResizeEnd && (
          <>
            {/* Handle gauche (début) - masqué pour statuts "lancee" et "prolongee" */}
            {!(activite.statut === 'lancee' || activite.statut === 'prolongee') && 
             !(activite.statut === 'suspendue' || activite.statut === 'terminee') && (
              <div
                className="absolute left-0 top-0 bottom-0 w-3 bg-white bg-opacity-0 hover:bg-opacity-40 cursor-ew-resize gantt-bar-handle z-10 border-l-2 border-white border-opacity-0 hover:border-opacity-50"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  resize.onStartHandleMouseDown(e);
                }}
                style={{ cursor: "ew-resize" }}
                title="Redimensionner le début"
              />
            )}
            {/* Handle droit (fin) - masqué pour statuts "suspendue" et "terminee" */}
            {!(activite.statut === 'suspendue' || activite.statut === 'terminee') && (
              <div
                className="absolute right-0 top-0 bottom-0 w-3 bg-white bg-opacity-0 hover:bg-opacity-40 cursor-ew-resize gantt-bar-handle z-10 border-r-2 border-white border-opacity-0 hover:border-opacity-50"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  resize.onEndHandleMouseDown(e);
                }}
                style={{ cursor: "ew-resize" }}
                title="Redimensionner la fin"
              />
            )}
          </>
        )}
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

