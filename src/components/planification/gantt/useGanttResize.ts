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
  const [lastSnappedDate, setLastSnappedDate] = useState<Date | null>(null);
  
  // Calculer la durée totale de la timeline
  const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
  
  // Calculer la largeur d'un jour en pixels (pour le seuil de snap)
  const nombreJours = (dateFinTimeline.getTime() - dateDebutTimeline.getTime()) / (1000 * 60 * 60 * 24);
  const largeurParJour = nombreJours > 0 ? largeurTotale / nombreJours : 0;
  const seuilSnap = largeurParJour * 0.5; // Snap après 50% d'un jour de mouvement (moins nerveux)

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
      setLastSnappedDate(null); // Réinitialiser le dernier snap
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
        const nouvelleDateDebut = new Date(initialDateDebut.getTime() + deltaTime);
        
        // Calculer la distance depuis le dernier snap (en jours)
        const distanceDepuisSnap = lastSnappedDate 
          ? Math.abs(nouvelleDateDebut.getTime() - lastSnappedDate.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        
        // Snap seulement si on a bougé d'au moins 0.5 jour ou si le mouvement est significatif
        const shouldSnap = Math.abs(deltaX) >= seuilSnap || distanceDepuisSnap >= 0.5;
        
        if (shouldSnap) {
          const dateDebutSnapped = snapToDay(nouvelleDateDebut);
          // Vérifier que la nouvelle date de début est valide
          if (dateDebutSnapped >= snapToDay(dateDebutTimeline) && dateDebutSnapped < snapToDay(initialDateFin)) {
            setInitialDateDebut(dateDebutSnapped);
            setLastSnappedDate(dateDebutSnapped);
          }
        }
        // Sinon, on ne met pas à jour pendant les micro-mouvements (évite le "nerveux")
      } else if (resizeHandle === "end") {
        const nouvelleDateFin = new Date(initialDateFin.getTime() + deltaTime);
        
        // Calculer la distance depuis le dernier snap (en jours)
        const distanceDepuisSnap = lastSnappedDate 
          ? Math.abs(nouvelleDateFin.getTime() - lastSnappedDate.getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        
        // Snap seulement si on a bougé d'au moins 0.5 jour ou si le mouvement est significatif
        const shouldSnap = Math.abs(deltaX) >= seuilSnap || distanceDepuisSnap >= 0.5;
        
        if (shouldSnap) {
          const dateFinSnapped = snapToDay(nouvelleDateFin);
          // Vérifier que la nouvelle date de fin est valide
          if (dateFinSnapped <= snapToDay(dateFinTimeline) && dateFinSnapped > snapToDay(initialDateDebut)) {
            setInitialDateFin(dateFinSnapped);
            setLastSnappedDate(dateFinSnapped);
          }
        }
        // Sinon, on ne met pas à jour pendant les micro-mouvements (évite le "nerveux")
      }
    },
    [isResizing, resizeHandle, resizeStartX, largeurTotale, dureeTotale, initialDateDebut, initialDateFin, dateDebutTimeline, dateFinTimeline, snapToDay, lastSnappedDate, seuilSnap]
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

