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
  const [hasJustResized, setHasJustResized] = useState(false);

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

  // Fonction pour arrondir une date au jour le plus proche (snap quotidien)
  const snapToDay = useCallback((date: Date): Date => {
    const snapped = new Date(date);
    snapped.setHours(0, 0, 0, 0);
    return snapped;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeHandle) return;

      const deltaX = e.clientX - resizeStartX;
      const deltaTime = (deltaX / largeurTotale) * dureeTotale;

      if (resizeHandle === "start") {
        let nouvelleDateDebut = new Date(initialDateDebut.getTime() + deltaTime);
        // Snap au jour le plus proche
        nouvelleDateDebut = snapToDay(nouvelleDateDebut);
        
        // Vérifier que la nouvelle date de début est valide
        if (nouvelleDateDebut >= snapToDay(dateDebutTimeline) && nouvelleDateDebut < snapToDay(initialDateFin)) {
          setInitialDateDebut(nouvelleDateDebut);
        }
      } else if (resizeHandle === "end") {
        let nouvelleDateFin = new Date(initialDateFin.getTime() + deltaTime);
        // Snap au jour le plus proche
        nouvelleDateFin = snapToDay(nouvelleDateFin);
        
        // Vérifier que la nouvelle date de fin est valide
        if (nouvelleDateFin <= snapToDay(dateFinTimeline) && nouvelleDateFin > snapToDay(initialDateDebut)) {
          setInitialDateFin(nouvelleDateFin);
        }
      }
    },
    [isResizing, resizeHandle, resizeStartX, largeurTotale, dureeTotale, initialDateDebut, initialDateFin, dateDebutTimeline, dateFinTimeline, snapToDay]
  );

  const handleMouseUp = useCallback(() => {
    if (!isResizing || !resizeHandle) return;

    setIsResizing(false);
    setResizeHandle(null);

    // Marquer qu'un resize vient d'être effectué pour empêcher le clic
    setHasJustResized(true);
    
    // Réinitialiser après un court délai pour permettre le clic normal après
    setTimeout(() => {
      setHasJustResized(false);
    }, 100);

    // S'assurer que les dates sont snapées au jour
    const dateDebutSnapped = snapToDay(initialDateDebut);
    const dateFinSnapped = snapToDay(initialDateFin);

    // Appeler le callback avec les nouvelles dates snapées
    onResizeEnd(activite.id, dateDebutSnapped, dateFinSnapped);
  }, [isResizing, resizeHandle, activite.id, initialDateDebut, initialDateFin, onResizeEnd, snapToDay]);

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
    hasJustResized,
    initialDateDebut: isResizing ? initialDateDebut : new Date(activite.date_debut_prevue),
    initialDateFin: isResizing ? initialDateFin : new Date(activite.date_fin_prevue),
    onStartHandleMouseDown: (e: React.MouseEvent) => handleMouseDown(e, "start"),
    onEndHandleMouseDown: (e: React.MouseEvent) => handleMouseDown(e, "end"),
  };
}

