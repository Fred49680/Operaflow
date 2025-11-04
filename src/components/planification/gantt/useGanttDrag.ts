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
  const [hasMoved, setHasMoved] = useState(false);
  const [hasJustDragged, setHasJustDragged] = useState(false);

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

      // Vérifier si le drag est autorisé selon le statut
      const statutsBloques = ['lancee', 'prolongee', 'suspendue', 'terminee'];
      if (statutsBloques.includes(activite.statut)) {
        // Afficher un message explicite selon le statut
        let message = "";
        if (activite.statut === 'lancee') {
          message = "La tâche est déjà lancée — la date de début est verrouillée.";
        } else if (activite.statut === 'prolongee') {
          message = "La tâche est prolongée — le déplacement est bloqué.";
        } else if (activite.statut === 'suspendue') {
          message = "La tâche est suspendue — le déplacement est bloqué.";
        } else if (activite.statut === 'terminee') {
          message = "La tâche est terminée — le déplacement est bloqué.";
        }
        alert(message);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      
      // Détecter si c'est un double-clic (pour modifier) ou un simple clic (pour drag)
      // Si c'est un double-clic, on ne démarre pas le drag
      if (e.detail === 2) {
        return;
      }

      setIsDragging(true);
      setDragStartX(e.clientX);
      setHasMoved(false);
    },
    [activite.statut]
  );

  // Fonction pour arrondir une date au jour le plus proche (snap quotidien)
  const snapToDay = useCallback((date: Date): Date => {
    const snapped = new Date(date);
    snapped.setHours(0, 0, 0, 0);
    return snapped;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      
      // Si le mouvement est > 5px, considérer qu'on drag
      if (Math.abs(deltaX) > 5) {
        setHasMoved(true);
      }
      
      const deltaTime = (deltaX / largeurTotale) * dureeTotale;
      setDragOffset(deltaTime);
    },
    [isDragging, dragStartX, largeurTotale, dureeTotale]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    const wasDragging = hasMoved && Math.abs(dragOffset) > 0;
    setIsDragging(false);

    // Si on a réellement bougé, sauvegarder les nouvelles dates
    if (wasDragging) {
      // Marquer qu'un drag vient d'être effectué pour empêcher le clic
      setHasJustDragged(true);
      
      // Réinitialiser après un court délai pour permettre le clic normal après
      setTimeout(() => {
        setHasJustDragged(false);
      }, 100);
      
      // Calculer les nouvelles dates
      const dateDebutActivite = new Date(activite.date_debut_prevue);
      const dateFinActivite = new Date(activite.date_fin_prevue);
      const dureeActivite = dateFinActivite.getTime() - dateDebutActivite.getTime();

      let nouvelleDateDebut = new Date(dateDebutActivite.getTime() + dragOffset);
      let nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + dureeActivite);

      // Snap au jour le plus proche (snap quotidien)
      nouvelleDateDebut = snapToDay(nouvelleDateDebut);
      nouvelleDateFin = snapToDay(nouvelleDateFin);

      // Vérifier que les dates restent dans la timeline
      if (nouvelleDateDebut >= snapToDay(dateDebutTimeline) && nouvelleDateFin <= snapToDay(dateFinTimeline)) {
        // Appeler le callback avec les dates snapées
        onDragEnd(activite.id, nouvelleDateDebut, nouvelleDateFin);
      }
    }

    setDragOffset(0);
    setHasMoved(false);
  }, [isDragging, hasMoved, dragOffset, activite, dateDebutTimeline, dateFinTimeline, onDragEnd, snapToDay]);

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
    hasJustDragged,
    onMouseDown: handleMouseDown,
  };
}

