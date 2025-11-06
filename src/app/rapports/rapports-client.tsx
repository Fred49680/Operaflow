"use client";

import { useState } from "react";
import { FileText, Mail, Calendar, Download, AlertCircle } from "lucide-react";

interface RapportsClientProps {
  userRoles: string[];
}

export default function RapportsClient({ userRoles }: RapportsClientProps) {
  const [loading, setLoading] = useState(false);
  const [dateRapport, setDateRapport] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [moisRapport, setMoisRapport] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const isConducteur = userRoles.includes("Conducteur de travaux");
  const isResponsableAffaire = userRoles.includes("Responsable d'Affaire");
  const isAdmin = userRoles.includes("Administrateur");

  const handleGenererRapportJournalier = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rapports/journalier?date=${dateRapport}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport-journalier-${dateRapport}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Erreur lors de la génération du rapport");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGenererRapportMensuel = async () => {
    setLoading(true);
    try {
      const [annee, mois] = moisRapport.split("-");
      const response = await fetch(`/api/rapports/mensuel?annee=${annee}&mois=${mois}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapport-mensuel-${moisRapport}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Erreur lors de la génération du rapport");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleEnvoyerRapportJournalier = async () => {
    if (!confirm("Envoyer le rapport journalier par email aux destinataires ?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/rapports/journalier/envoyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateRapport }),
      });

      if (response.ok) {
        alert("Rapport journalier envoyé avec succès");
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
            Rapports Automatiques
          </h1>
          <p className="text-base sm:text-lg text-secondary">
            Génération et envoi des rapports journaliers et mensuels
          </p>
        </div>

        {/* Rapport Journalier */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-800">Rapport Journalier</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              Envoi automatique 17h30
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Rapport quotidien avec KPIs, activités réalisées/reportées/terminées, motifs de report,
            OTs manquants et activités à rattacher.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={dateRapport}
                onChange={(e) => setDateRapport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenererRapportJournalier}
                disabled={loading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Générer PDF
              </button>

              {(isResponsableAffaire || isAdmin) && (
                <button
                  onClick={handleEnvoyerRapportJournalier}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  Envoyer Email
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rapport Mensuel */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-800">Rapport Mensuel</h2>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
              Génération automatique 1er du mois
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Rapport mensuel avec KPIs, journal complet, candidats facturation, lignes reportées,
            OTs manquants, anomalies et historique des activités à rattacher.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Mois
              </label>
              <input
                type="month"
                value={moisRapport}
                onChange={(e) => setMoisRapport(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <button
              onClick={handleGenererRapportMensuel}
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Générer PDF
            </button>
          </div>
        </div>

        {/* Informations */}
        <div className="card bg-blue-50 border-l-4 border-l-blue-400">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Rapports automatiques</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <strong>Rapport journalier</strong> : Envoyé automatiquement chaque jour ouvré à
                  17h30 aux Responsables d'Affaire
                </li>
                <li>
                  • <strong>Rapport mensuel</strong> : Généré automatiquement le 1er du mois à
                  06h00 et archivé pour 12 mois
                </li>
                <li>
                  • Les rapports peuvent également être générés manuellement à tout moment
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

