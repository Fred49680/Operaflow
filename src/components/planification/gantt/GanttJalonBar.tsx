"use client";

import { useMemo } from "react";

interface JalonGantt {
  id: string;
  affaire_id: string;
  numero_lot: string;
  libelle_lot: string;
  date_debut_previsionnelle?: string | null;
  date_fin_previsionnelle?: string | null;
  statut?: string | null;
}

interface GanttJalonBarProps {
  jalon: JalonGantt;
  dateDebutTimeline: Date;
  dateFinTimeline: Date;
  largeurTotale: number;
  onClick?: () => void;
}

export default function GanttJalonBar({
  jalon,
  dateDebutTimeline,
  dateFinTimeline,
  largeurTotale,
  onClick,
}: GanttJalonBarProps) {
  // Calculer la position et la largeur de la barre de jalon
  const { left, width } = useMemo(() => {
    const dateDebut = jalon.date_debut_previsionnelle ? new Date(jalon.date_debut_previsionnelle) : null;
    const dateFin = jalon.date_fin_previsionnelle ? new Date(jalon.date_fin_previsionnelle) : null;

    if (!dateDebut && !dateFin) {
      return { left: 0, width: 0 };
    }

    const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
    
    // Si seulement une date est disponible, utiliser un point (largeur fixe)
    if (!dateDebut || !dateFin) {
      const dateUnique = dateDebut || dateFin!;
      const position = dateUnique.getTime() - dateDebutTimeline.getTime();
      return {
        left: Math.max(0, (position / dureeTotale) * largeurTotale),
        width: 4, // Point de 4px pour jalon sans période
      };
    }

    // Jalon avec période (début et fin)
    const debutBarre = dateDebut.getTime() - dateDebutTimeline.getTime();
    const dureeBarre = dateFin.getTime() - dateDebut.getTime();

    return {
      left: Math.max(0, (debutBarre / dureeTotale) * largeurTotale),
      width: Math.max(4, (dureeBarre / dureeTotale) * largeurTotale),
    };
  }, [jalon, dateDebutTimeline, dateFinTimeline, largeurTotale]);

  // Couleur selon le statut du jalon
  const couleur = useMemo(() => {
    if (jalon.statut === "a_receptionner") return "bg-yellow-500 border-yellow-600";
    if (jalon.statut === "receptionne") return "bg-green-500 border-green-600";
    return "bg-purple-500 border-purple-600"; // Jalon planifié
  }, [jalon.statut]);

  const isPoint = !jalon.date_debut_previsionnelle || !jalon.date_fin_previsionnelle;

  return (
    <div
      className={`relative h-6 group cursor-pointer ${isPoint ? "z-20" : "z-10"}`}
      style={{ left: `${left}px`, width: `${width}px` }}
      onClick={onClick}
    >
      {/* Barre de jalon */}
      {isPoint ? (
        // Point de jalon (losange)
        <div
          className={`${couleur} w-4 h-4 transform rotate-45 border-2 shadow-md absolute -top-1 -left-2`}
          style={{ borderColor: couleur.split(" ")[1] }}
        />
      ) : (
        // Barre de jalon (période)
        <div
          className={`${couleur} h-full rounded-sm border-2 shadow-sm hover:shadow-md transition-shadow`}
        >
          {/* Libellé du jalon */}
          <div className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white truncate">
            {jalon.libelle_lot}
          </div>
        </div>
      )}

      {/* Tooltip au survol */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-30">
        <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg whitespace-nowrap">
          <div className="font-semibold text-purple-300">JALON: {jalon.libelle_lot}</div>
          <div className="text-gray-300 mt-1">
            {jalon.date_debut_previsionnelle
              ? new Date(jalon.date_debut_previsionnelle).toLocaleDateString("fr-FR")
              : "N/A"}{" "}
            -{" "}
            {jalon.date_fin_previsionnelle
              ? new Date(jalon.date_fin_previsionnelle).toLocaleDateString("fr-FR")
              : "N/A"}
          </div>
          <div className="text-gray-300">
            Statut: {jalon.statut === "a_receptionner" ? "À réceptionner" : jalon.statut || "Planifié"}
          </div>
          <div className="text-gray-300">Numéro: {jalon.numero_lot}</div>
        </div>
      </div>
    </div>
  );
}

