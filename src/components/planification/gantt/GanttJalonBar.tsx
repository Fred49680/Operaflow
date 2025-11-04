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
  // Calculer la position et la largeur de la barre de jalon (TOUJOURS une barre horizontale)
  const { left, width } = useMemo(() => {
    const dateDebut = jalon.date_debut_previsionnelle ? new Date(jalon.date_debut_previsionnelle) : null;
    const dateFin = jalon.date_fin_previsionnelle ? new Date(jalon.date_fin_previsionnelle) : null;

    if (!dateDebut && !dateFin) {
      return { left: 0, width: 0 };
    }

    const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
    
    // Si seulement une date est disponible, créer une barre de 1 jour
    if (!dateDebut || !dateFin) {
      const dateUnique = dateDebut || dateFin!;
      const position = dateUnique.getTime() - dateDebutTimeline.getTime();
      const largeurJour = largeurTotale / (dureeTotale / (1000 * 60 * 60 * 24)); // Largeur d'un jour
      return {
        left: Math.max(0, (position / dureeTotale) * largeurTotale),
        width: Math.max(20, largeurJour), // Minimum 20px pour visibilité
      };
    }

    // Jalon avec période (début et fin) - BARRE HORIZONTALE
    const debutBarre = dateDebut.getTime() - dateDebutTimeline.getTime();
    const dureeBarre = dateFin.getTime() - dateDebut.getTime();

    return {
      left: Math.max(0, (debutBarre / dureeTotale) * largeurTotale),
      width: Math.max(20, (dureeBarre / dureeTotale) * largeurTotale), // Minimum 20px
    };
  }, [jalon, dateDebutTimeline, dateFinTimeline, largeurTotale]);

  // Couleur selon le statut du jalon
  const couleur = useMemo(() => {
    if (jalon.statut === "a_receptionner") return "bg-yellow-500 border-yellow-600";
    if (jalon.statut === "receptionne") return "bg-green-500 border-green-600";
    return "bg-purple-500 border-purple-600"; // Jalon planifié
  }, [jalon.statut]);

  return (
    <div
      className="relative group cursor-pointer flex items-center"
      style={{ left: `${left}px`, width: `${width}px`, height: "40px" }}
      onClick={onClick}
    >
      {/* Barre de jalon - TOUJOURS une barre horizontale */}
      <div
        className={`${couleur} h-8 rounded-sm border-2 shadow-sm hover:shadow-md transition-shadow flex items-center`}
        style={{ width: "100%", minHeight: "32px" }}
      >
        {/* Libellé du jalon */}
        <div className="absolute inset-0 flex items-center px-2 text-xs font-bold text-white truncate">
          {jalon.libelle_lot}
        </div>
      </div>

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

