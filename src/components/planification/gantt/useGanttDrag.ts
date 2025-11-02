import { useState, useCallback, useEffect } from "react";
import type { ActivitePlanification } from "@/types/planification";

interface UseGanttDragProps {
  activite: ActivitePlanification;
  dateDebutTimeline: Date;
  dateFinTimeline: Date;
  largeurTotale: number;
  onDragEnd: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
}

export function useGanttDrag({
  activite,
  dateDebutTimeline,
  dateFinTimeline,
  largeurTotale,
  onDragEnd,
}: UseGanttDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [initialLeft, setInitialLeft] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);

  // Calculer la durée totale de la timeline
  const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();

  // Calculer la position initiale de la barre
  useEffect(() => {
    const dateDebutActivite = new Date(activite.date_debut_prevue);
    const dateFinActivite = new Date(activite.date_fin_prevue);

    const debutBarre = dateDebutActivite.getTime() - dateDebutTimeline.getTime();
    const dureeBarre = dateFinActivite.getTime() - dateDebutActivite.getTime();

    setInitialLeft((debutBarre / dureeTotale) * largeurTotale);
    setInitialWidth((dureeBarre / dureeTotale) * largeurTotale);
    setDragOffset(0);
  }, [activite, dateDebutTimeline, dateFinTimeline, largeurTotale, dureeTotale]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Ne pas démarrer le drag si on clique sur le texte ou les handles
      if ((e.target as HTMLElement).closest(".gantt-bar-handle")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragStartX(e.clientX);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaTime = (deltaX / largeurTotale) * dureeTotale;
      
      setDragOffset(deltaTime);
    },
    [isDragging, dragStartX, largeurTotale, dureeTotale]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // Calculer les nouvelles dates
    const dateDebutActivite = new Date(activite.date_debut_prevue);
    const dateFinActivite = new Date(activite.date_fin_prevue);
    const dureeActivite = dateFinActivite.getTime() - dateDebutActivite.getTime();

    const nouvelleDateDebut = new Date(dateDebutActivite.getTime() + dragOffset);
    const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeActivite);

    // Vérifier que les dates restent dans la timeline
    if (nouvelleDateDebut < dateDebutTimeline || nouvelleDateFin > dateFinTimeline) {
      setDragOffset(0);
      return;
    }

    // Appeler le callback
    onDragEnd(activite.id, nouvelleDateDebut, nouvelleDateFin);
    setDragOffset(0);
  }, [isDragging, dragOffset, activite, dateDebutTimeline, dateFinTimeline, onDragEnd]);

  // Gérer les événements globaux
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculer la position actuelle (incluant le drag)
  const currentLeft = Math.max(0, initialLeft + (dragOffset / dureeTotale) * largeurTotale);

  return {
    isDragging,
    currentLeft,
    width: initialWidth,
    onMouseDown: handleMouseDown,
  };
}

