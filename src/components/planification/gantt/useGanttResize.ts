import { useState, useCallback, useEffect } from "react";
import type { ActivitePlanification } from "@/types/planification";

interface UseGanttResizeProps {
  activite: ActivitePlanification;
  dateDebutTimeline: Date;
  dateFinTimeline: Date;
  largeurTotale: number;
  onResizeEnd: (activiteId: string, nouvelleDateDebut: Date, nouvelleDateFin: Date) => void;
}

type ResizeHandle = "start" | "end" | null;

export function useGanttResize({
  activite,
  dateDebutTimeline,
  dateFinTimeline,
  largeurTotale,
  onResizeEnd,
}: UseGanttResizeProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [initialDateDebut, setInitialDateDebut] = useState<Date>(new Date(activite.date_debut_prevue));
  const [initialDateFin, setInitialDateFin] = useState<Date>(new Date(activite.date_fin_prevue));

  // Calculer la durée totale de la timeline
  const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();

  // Mettre à jour les dates initiales quand l'activité change
  useEffect(() => {
    setInitialDateDebut(new Date(activite.date_debut_prevue));
    setInitialDateFin(new Date(activite.date_fin_prevue));
  }, [activite]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: "start" | "end") => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStartX(e.clientX);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeHandle) return;

      const deltaX = e.clientX - resizeStartX;
      const deltaTime = (deltaX / largeurTotale) * dureeTotale;

      if (resizeHandle === "start") {
        const nouvelleDateDebut = new Date(initialDateDebut.getTime() + deltaTime);
        // Vérifier que la nouvelle date de début est valide
        if (nouvelleDateDebut >= dateDebutTimeline && nouvelleDateDebut < initialDateFin) {
          setInitialDateDebut(nouvelleDateDebut);
        }
      } else if (resizeHandle === "end") {
        const nouvelleDateFin = new Date(initialDateFin.getTime() + deltaTime);
        // Vérifier que la nouvelle date de fin est valide
        if (nouvelleDateFin <= dateFinTimeline && nouvelleDateFin > initialDateDebut) {
          setInitialDateFin(nouvelleDateFin);
        }
      }
    },
    [isResizing, resizeHandle, resizeStartX, largeurTotale, dureeTotale, initialDateDebut, initialDateFin, dateDebutTimeline, dateFinTimeline]
  );

  const handleMouseUp = useCallback(() => {
    if (!isResizing || !resizeHandle) return;

    setIsResizing(false);
    setResizeHandle(null);

    // Appeler le callback avec les nouvelles dates
    onResizeEnd(activite.id, initialDateDebut, initialDateFin);
  }, [isResizing, resizeHandle, activite.id, initialDateDebut, initialDateFin, onResizeEnd]);

  // Gérer les événements globaux
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Calculer les dates actuelles pour l'affichage pendant le resize
  const currentDateDebut = isResizing && resizeHandle === "start" 
    ? initialDateDebut 
    : new Date(activite.date_debut_prevue);
  const currentDateFin = isResizing && resizeHandle === "end"
    ? initialDateFin
    : new Date(activite.date_fin_prevue);

  return {
    isResizing,
    resizeHandle,
    initialDateDebut: isResizing ? initialDateDebut : new Date(activite.date_debut_prevue),
    initialDateFin: isResizing ? initialDateFin : new Date(activite.date_fin_prevue),
    onStartHandleMouseDown: (e: React.MouseEvent) => handleMouseDown(e, "start"),
    onEndHandleMouseDown: (e: React.MouseEvent) => handleMouseDown(e, "end"),
  };
}

