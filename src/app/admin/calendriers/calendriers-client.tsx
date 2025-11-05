"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Calendar, Trash2, MapPin, Clock, CheckCircle, AlertCircle, Edit2 } from "lucide-react";

interface Site {
  site_id: string;
  site_code: string;
  site_label: string;
}

interface CalendrierJour {
  id: string;
  calendrier_id: string;
  date_jour: string;
  type_jour: "ouvre" | "ferie" | "chome" | "reduit" | "exceptionnel";
  heures_travail: number; // Décimal en base de données
  libelle: string | null;
  est_recurrent: boolean;
}

interface JourFormData {
  date_jour: string;
  type_jour: "ouvre" | "ferie" | "chome" | "reduit" | "exceptionnel";
  heures_travail: string; // Format HH:mm pour l'affichage
  heures_travail_decimal: number; // Décimal pour l'envoi à l'API
  libelle: string;
  est_recurrent: boolean;
}

interface Calendrier {
  id: string;
  libelle: string;
  description: string | null;
  site_id: string | null;
  actif: boolean;
  annee_reference: number | null;
  site: Site | null;
  created_at: string;
  updated_at: string;
}

interface CalendriersClientProps {
  calendriers: Calendrier[];
  sites: Site[];
}

export default function CalendriersClient({
  calendriers: initialCalendriers,
  sites,
}: CalendriersClientProps) {
  const router = useRouter();
  const [calendriers, setCalendriers] = useState(initialCalendriers);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCalendrier, setSelectedCalendrier] = useState<Calendrier | null>(null);
  const [joursCalendrier, setJoursCalendrier] = useState<CalendrierJour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editJourModalOpen, setEditJourModalOpen] = useState(false);
  const [selectedJour, setSelectedJour] = useState<CalendrierJour | null>(null);
  const [semaineTypeModalOpen, setSemaineTypeModalOpen] = useState(false);
  // Fonction pour convertir décimal en format HH:mm
  const decimalToTime = (decimal: number): string => {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Fonction pour convertir format HH:mm en décimal
  const timeToDecimal = (timeStr: string): number => {
    if (!timeStr || timeStr === "") return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + (minutes || 0) / 60;
  };

  const [joursSelectionnes, setJoursSelectionnes] = useState<Set<number>>(new Set());
  const [semaineType, setSemaineType] = useState<Array<{
    jour_semaine: number;
    nom_jour: string;
    heures_travail: number;
    heures_travail_display: string; // Format HH:mm pour l'affichage
    type_jour: string;
    heure_debut: string; // Format HH:mm
    heure_pause_debut: string; // Format HH:mm
    heure_pause_fin: string; // Format HH:mm
    heure_fin: string; // Format HH:mm
  }>>([
    { jour_semaine: 0, nom_jour: "Dimanche", heures_travail: 0, heures_travail_display: "00:00", type_jour: "chome", heure_debut: "00:00", heure_pause_debut: "00:00", heure_pause_fin: "00:00", heure_fin: "00:00" },
    { jour_semaine: 1, nom_jour: "Lundi", heures_travail: 7, heures_travail_display: "07:00", type_jour: "ouvre", heure_debut: "08:00", heure_pause_debut: "12:00", heure_pause_fin: "13:00", heure_fin: "16:00" },
    { jour_semaine: 2, nom_jour: "Mardi", heures_travail: 7, heures_travail_display: "07:00", type_jour: "ouvre", heure_debut: "08:00", heure_pause_debut: "12:00", heure_pause_fin: "13:00", heure_fin: "16:00" },
    { jour_semaine: 3, nom_jour: "Mercredi", heures_travail: 7, heures_travail_display: "07:00", type_jour: "ouvre", heure_debut: "08:00", heure_pause_debut: "12:00", heure_pause_fin: "13:00", heure_fin: "16:00" },
    { jour_semaine: 4, nom_jour: "Jeudi", heures_travail: 7, heures_travail_display: "07:00", type_jour: "ouvre", heure_debut: "08:00", heure_pause_debut: "12:00", heure_pause_fin: "13:00", heure_fin: "16:00" },
    { jour_semaine: 5, nom_jour: "Vendredi", heures_travail: 7, heures_travail_display: "07:00", type_jour: "ouvre", heure_debut: "08:00", heure_pause_debut: "12:00", heure_pause_fin: "13:00", heure_fin: "16:00" },
    { jour_semaine: 6, nom_jour: "Samedi", heures_travail: 0, heures_travail_display: "00:00", type_jour: "chome", heure_debut: "00:00", heure_pause_debut: "00:00", heure_pause_fin: "00:00", heure_fin: "00:00" },
  ]);
  const [jourFormData, setJourFormData] = useState<JourFormData>({
    date_jour: "",
    type_jour: "ouvre",
    heures_travail: "08:00",
    heures_travail_decimal: 8,
    libelle: "",
    est_recurrent: false,
  });

  const [formData, setFormData] = useState<{
    libelle: string;
    description: string;
    site_id: string;
    actif: boolean;
    annee_reference: number | null;
  }>({
    libelle: "",
    description: "",
    site_id: "",
    actif: true,
    annee_reference: new Date().getFullYear(),
  });

  const fetchJours = async (calendrierId: string) => {
    try {
      const response = await fetch(`/api/admin/calendriers/${calendrierId}/jours`);
      if (response.ok) {
        const data = await response.json();
        setJoursCalendrier(data.jours || []);
      }
    } catch (err) {
      console.error("Erreur récupération jours:", err);
    }
  };

  // Fonction pour calculer les heures travaillées à partir des heures détaillées
  const calculerHeuresTravail = (heureDebut: string, heurePauseDebut: string, heurePauseFin: string, heureFin: string): number => {
    if (!heureDebut || !heureFin || heureDebut === "00:00" || heureFin === "00:00") {
      return 0;
    }
    
    const [hDebut, mDebut] = heureDebut.split(":").map(Number);
    const [hFin, mFin] = heureFin.split(":").map(Number);
    
    // Durée totale en heures
    const dureeTotale = (hFin * 60 + mFin - (hDebut * 60 + mDebut)) / 60;
    
    // Si pause définie, soustraire sa durée
    if (heurePauseDebut && heurePauseFin && heurePauseDebut !== "00:00" && heurePauseFin !== "00:00") {
      const [hPauseDebut, mPauseDebut] = heurePauseDebut.split(":").map(Number);
      const [hPauseFin, mPauseFin] = heurePauseFin.split(":").map(Number);
      const dureePause = (hPauseFin * 60 + mPauseFin - (hPauseDebut * 60 + mPauseDebut)) / 60;
      return Math.max(0, dureeTotale - dureePause);
    }
    
    return Math.max(0, dureeTotale);
  };

  const fetchSemaineType = async (calendrierId: string) => {
    try {
      const response = await fetch(`/api/admin/calendriers/${calendrierId}/semaine-type`);
      if (response.ok) {
        const data = await response.json();
        const st = data.semaine_type || [];
        // Mettre à jour la semaine type avec les valeurs de la base
        setSemaineType((prev) =>
          prev.map((jour) => {
            const dbJour = st.find((j: { jour_semaine: number }) => j.jour_semaine === jour.jour_semaine);
            if (dbJour) {
              // Convertir les heures TIME en format HH:mm
              const formatTime = (time: string | null): string => {
                if (!time) return "00:00";
                // Si c'est déjà au format HH:mm, retourner tel quel
                if (time.includes(":")) return time;
                // Sinon, convertir depuis TIME SQL
                return time.slice(0, 5);
              };
              
              const heureDebut = formatTime(dbJour.heure_debut);
              const heurePauseDebut = formatTime(dbJour.heure_pause_debut);
              const heurePauseFin = formatTime(dbJour.heure_pause_fin);
              const heureFin = formatTime(dbJour.heure_fin);
              
              // Calculer les heures travaillées si les heures détaillées sont renseignées
              const heuresCalc = (heureDebut && heureFin && heureDebut !== "00:00" && heureFin !== "00:00")
                ? calculerHeuresTravail(heureDebut, heurePauseDebut, heurePauseFin, heureFin)
                : dbJour.heures_travail || 0;
              
              return {
                ...jour,
                heures_travail: heuresCalc,
                heures_travail_display: decimalToTime(heuresCalc),
                type_jour: dbJour.type_jour,
                heure_debut: heureDebut || jour.heure_debut,
                heure_pause_debut: heurePauseDebut || jour.heure_pause_debut,
                heure_pause_fin: heurePauseFin || jour.heure_pause_fin,
                heure_fin: heureFin || jour.heure_fin,
              };
            }
            return jour;
          })
        );
      }
    } catch (err) {
      console.error("Erreur récupération semaine type:", err);
    }
  };

  const handleSaveSemaineType = async () => {
    if (!selectedCalendrier) return;

    setLoading(true);
    setError(null);

    try {
      // Préparer les données avec les heures détaillées
      const semaineTypeToSend = semaineType.map((jour) => ({
        jour_semaine: jour.jour_semaine,
        heures_travail: jour.heures_travail, // Calculé automatiquement côté serveur si heures détaillées renseignées
        type_jour: jour.type_jour,
        heure_debut: jour.type_jour === "ouvre" ? jour.heure_debut : null,
        heure_pause_debut: jour.type_jour === "ouvre" ? jour.heure_pause_debut : null,
        heure_pause_fin: jour.type_jour === "ouvre" ? jour.heure_pause_fin : null,
        heure_fin: jour.type_jour === "ouvre" ? jour.heure_fin : null,
      }));

      const response = await fetch(`/api/admin/calendriers/${selectedCalendrier.id}/semaine-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semaine_type: semaineTypeToSend }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }

      setSuccess("Semaine type sauvegardée avec succès");
      setSemaineTypeModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };


  const handleCreate = async () => {
    if (!formData.libelle.trim()) {
      setError("Le libellé est requis");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/calendriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          site_id: formData.site_id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création");
      }

      const newCalendrier = await response.json();
      setSuccess("Calendrier créé avec succès");
      setModalOpen(false);
      setFormData({
        libelle: "",
        description: "",
        site_id: "",
        actif: true,
        annee_reference: new Date().getFullYear(),
      });
      // Rafraîchir la liste des calendriers
      const refreshResponse = await fetch("/api/admin/calendriers");
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setCalendriers(refreshData.calendriers || []);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  const handleToggleActif = async (calendrier: Calendrier) => {
    try {
      const response = await fetch(`/api/admin/calendriers/${calendrier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !calendrier.actif }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      setCalendriers((prev) =>
        prev.map((c) =>
          c.id === calendrier.id ? { ...c, actif: !c.actif } : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleDelete = async (calendrier: Calendrier) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le calendrier "${calendrier.libelle}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/calendriers/${calendrier.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      setCalendriers((prev) => prev.filter((c) => c.id !== calendrier.id));
      setSuccess("Calendrier supprimé avec succès");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleViewDetails = async (calendrier: Calendrier) => {
    setSelectedCalendrier(calendrier);
    setDetailModalOpen(true);
    await fetchJours(calendrier.id);
    await fetchSemaineType(calendrier.id);
  };

  const handleCloseDetailModal = async () => {
    // Sauvegarder automatiquement la semaine type si elle a été modifiée
    if (selectedCalendrier && semaineType.length > 0) {
      try {
        const semaineTypeToSend = semaineType.map((jour) => ({
          jour_semaine: jour.jour_semaine,
          heures_travail: jour.heures_travail,
          type_jour: jour.type_jour,
          heure_debut: jour.type_jour === "ouvre" ? jour.heure_debut : null,
          heure_pause_debut: jour.type_jour === "ouvre" ? jour.heure_pause_debut : null,
          heure_pause_fin: jour.type_jour === "ouvre" ? jour.heure_pause_fin : null,
          heure_fin: jour.type_jour === "ouvre" ? jour.heure_fin : null,
        }));

        await fetch(`/api/admin/calendriers/${selectedCalendrier.id}/semaine-type`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semaine_type: semaineTypeToSend }),
        });
      } catch (err) {
        console.error("Erreur sauvegarde automatique semaine type:", err);
      }
    }
    setDetailModalOpen(false);
    setSelectedCalendrier(null);
  };

  const handleAddJour = () => {
    if (!selectedCalendrier) return;
    setSelectedJour(null);
    setJourFormData({
      date_jour: "",
      type_jour: "ouvre",
      heures_travail: "08:00",
      heures_travail_decimal: 8,
      libelle: "",
      est_recurrent: false,
    });
    setEditJourModalOpen(true);
  };

  const handleEditJour = (jour: CalendrierJour) => {
    setSelectedJour(jour);
    setJourFormData({
      date_jour: jour.date_jour,
      type_jour: jour.type_jour,
      heures_travail: decimalToTime(jour.heures_travail),
      heures_travail_decimal: jour.heures_travail,
      libelle: jour.libelle || "",
      est_recurrent: jour.est_recurrent,
    });
    setEditJourModalOpen(true);
  };

  const handleSaveJour = async () => {
    if (!selectedCalendrier || !jourFormData.date_jour) {
      setError("La date est requise");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = selectedJour
        ? `/api/admin/calendriers/${selectedCalendrier.id}/jours/${selectedJour.id}`
        : `/api/admin/calendriers/${selectedCalendrier.id}/jours`;
      
      const method = selectedJour ? "PATCH" : "POST";

      // Préparer les données pour l'envoi (convertir heures en décimal)
      const dataToSend = {
        calendrier_id: selectedCalendrier.id,
        date_jour: jourFormData.date_jour,
        type_jour: jourFormData.type_jour,
        heures_travail: jourFormData.heures_travail_decimal || timeToDecimal(jourFormData.heures_travail),
        libelle: jourFormData.libelle || null,
        est_recurrent: jourFormData.est_recurrent,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la sauvegarde");
      }

      setSuccess(selectedJour ? "Jour modifié avec succès" : "Jour ajouté avec succès");
      setEditJourModalOpen(false);
      setSelectedJour(null);
      await fetchJours(selectedCalendrier.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJour = async (jour: CalendrierJour) => {
    if (!selectedCalendrier || !confirm(`Supprimer le jour ${new Date(jour.date_jour).toLocaleDateString("fr-FR")} ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/calendriers/${selectedCalendrier.id}/jours/${jour.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      setSuccess("Jour supprimé avec succès");
      await fetchJours(selectedCalendrier.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const getTypeJourLabel = (type: string) => {
    const labels: Record<string, string> = {
      ouvre: "Jour ouvré",
      ferie: "Jour férié",
      chome: "Jour chômé",
      reduit: "Heures réduites",
      exceptionnel: "Exceptionnel",
    };
    return labels[type] || type;
  };

  const getTypeJourColor = (type: string) => {
    const colors: Record<string, string> = {
      ouvre: "bg-green-100 text-green-800",
      ferie: "bg-red-100 text-red-800",
      chome: "bg-gray-100 text-gray-800",
      reduit: "bg-yellow-100 text-yellow-800",
      exceptionnel: "bg-blue-100 text-blue-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Messages d'alerte */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* En-tête avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary">Liste des calendriers</h2>
          <p className="text-gray-600 mt-1">
            {calendriers.length} calendrier{calendriers.length > 1 ? "s" : ""} défini{calendriers.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nouveau calendrier
        </button>
      </div>

      {/* Tableau des calendriers */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Libellé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calendriers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Aucun calendrier défini
                  </td>
                </tr>
              ) : (
                calendriers.map((calendrier) => (
                  <tr
                    key={calendrier.id}
                    onClick={() => handleViewDetails(calendrier)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {calendrier.libelle}
                          </div>
                          {calendrier.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {calendrier.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {calendrier.site ? (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {calendrier.site.site_label}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Global</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {calendrier.annee_reference || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActif(calendrier);
                        }}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          calendrier.actif
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                        title={`Cliquer pour ${calendrier.actif ? "désactiver" : "activer"}`}
                      >
                        {calendrier.actif ? "Actif" : "Inactif"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de création */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-secondary">Nouveau calendrier</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Libellé <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.libelle}
                  onChange={(e) =>
                    setFormData({ ...formData, libelle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ex: Calendrier Dampierre 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Description du calendrier..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site (optionnel)
                  </label>
                  <select
                    value={formData.site_id}
                    onChange={(e) =>
                      setFormData({ ...formData, site_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Aucun (calendrier global)</option>
                    {sites.map((site) => (
                      <option key={site.site_id} value={site.site_id}>
                        {site.site_label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année de référence
                  </label>
                  <input
                    type="number"
                    value={formData.annee_reference ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        annee_reference: e.target.value ? parseInt(e.target.value) || null : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="2025"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="actif"
                  checked={formData.actif}
                  onChange={(e) =>
                    setFormData({ ...formData, actif: e.target.checked })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="actif" className="text-sm font-medium text-gray-700">
                  Calendrier actif
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {detailModalOpen && selectedCalendrier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-secondary">
                  {selectedCalendrier.libelle}
                </h3>
                {selectedCalendrier.site && (
                  <p className="text-sm text-gray-600 mt-1">
                    Site: {selectedCalendrier.site.site_label}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseDetailModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section Semaine Type */}
              <div className="border-b pb-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Semaine Type</h4>
                  <p className="text-sm text-gray-600">
                    Modifiez directement dans les cellules. Les modifications seront sauvegardées automatiquement à la fermeture du modal.
                  </p>
                  <p className="text-xs text-primary mt-2">
                    💡 Sélectionnez plusieurs jours pour appliquer les mêmes horaires automatiquement
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {semaineType.map((jour, index) => {
                    const isSelected = joursSelectionnes.has(jour.jour_semaine);
                    return (
                    <div
                      key={jour.jour_semaine}
                      className={`p-3 rounded-lg border transition-colors ${
                        isSelected 
                          ? "bg-primary/10 border-primary border-2" 
                          : "bg-gray-50 border-gray-200 hover:border-primary"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-700 text-center flex-1">
                          {jour.nom_jour}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelection = new Set(joursSelectionnes);
                            if (e.target.checked) {
                              newSelection.add(jour.jour_semaine);
                            } else {
                              newSelection.delete(jour.jour_semaine);
                            }
                            setJoursSelectionnes(newSelection);
                          }}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary ml-2"
                          title="Sélectionner ce jour"
                        />
                      </div>
                      
                      {/* Type de jour - Éditable */}
                      <div className="mb-2">
                        <select
                          value={jour.type_jour}
                          onChange={(e) => {
                            const newSemaineType = [...semaineType];
                            newSemaineType[index].type_jour = e.target.value;
                            if (e.target.value === "chome" || e.target.value === "ferie") {
                              newSemaineType[index].heures_travail = 0;
                              newSemaineType[index].heures_travail_display = "00:00";
                              newSemaineType[index].heure_debut = "00:00";
                              newSemaineType[index].heure_pause_debut = "00:00";
                              newSemaineType[index].heure_pause_fin = "00:00";
                              newSemaineType[index].heure_fin = "00:00";
                            }
                            setSemaineType(newSemaineType);
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="ouvre">Ouvré</option>
                          <option value="chome">Chômé</option>
                          <option value="ferie">Férié</option>
                          <option value="reduit">Réduit</option>
                        </select>
                      </div>

                      {/* Heures détaillées - Éditable uniquement pour jours ouvrés */}
                      {jour.type_jour === "ouvre" ? (
                        <div className="space-y-1.5">
                          {/* Heure de début */}
                          <div>
                            <label className="text-xs text-gray-600 mb-0.5 block">Début</label>
                            <input
                              type="time"
                              value={jour.heure_debut}
                              onChange={(e) => {
                                const newValue = e.target.value || "08:00";
                                const newSemaineType = [...semaineType];
                                
                                // Appliquer aux jours sélectionnés (sauf celui modifié qui est déjà dans la liste)
                                joursSelectionnes.forEach((jourSemaine) => {
                                  const idx = semaineType.findIndex(j => j.jour_semaine === jourSemaine);
                                  if (idx !== -1 && semaineType[idx].type_jour === "ouvre") {
                                    newSemaineType[idx].heure_debut = newValue;
                                    const heuresCalc = calculerHeuresTravail(
                                      newSemaineType[idx].heure_debut,
                                      newSemaineType[idx].heure_pause_debut,
                                      newSemaineType[idx].heure_pause_fin,
                                      newSemaineType[idx].heure_fin
                                    );
                                    newSemaineType[idx].heures_travail = heuresCalc;
                                    newSemaineType[idx].heures_travail_display = decimalToTime(heuresCalc);
                                  }
                                });
                                
                                // Mettre à jour le jour actuel
                                newSemaineType[index].heure_debut = newValue;
                                const heuresCalc = calculerHeuresTravail(
                                  newSemaineType[index].heure_debut,
                                  newSemaineType[index].heure_pause_debut,
                                  newSemaineType[index].heure_pause_fin,
                                  newSemaineType[index].heure_fin
                                );
                                newSemaineType[index].heures_travail = heuresCalc;
                                newSemaineType[index].heures_travail_display = decimalToTime(heuresCalc);
                                setSemaineType(newSemaineType);
                              }}
                              className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* Pause repas */}
                          <div>
                            <label className="text-xs text-gray-600 mb-0.5 block">Pause</label>
                            <div className="space-y-1">
                              <input
                                type="time"
                                value={jour.heure_pause_debut}
                                onChange={(e) => {
                                  const newValue = e.target.value || "12:00";
                                  const newSemaineType = [...semaineType];
                                  
                                  // Appliquer aux jours sélectionnés
                                  joursSelectionnes.forEach((jourSemaine) => {
                                    const idx = semaineType.findIndex(j => j.jour_semaine === jourSemaine);
                                    if (idx !== -1 && semaineType[idx].type_jour === "ouvre") {
                                      newSemaineType[idx].heure_pause_debut = newValue;
                                      const heuresCalc = calculerHeuresTravail(
                                        newSemaineType[idx].heure_debut,
                                        newSemaineType[idx].heure_pause_debut,
                                        newSemaineType[idx].heure_pause_fin,
                                        newSemaineType[idx].heure_fin
                                      );
                                      newSemaineType[idx].heures_travail = heuresCalc;
                                      newSemaineType[idx].heures_travail_display = decimalToTime(heuresCalc);
                                    }
                                  });
                                  
                                  // Mettre à jour le jour actuel
                                  newSemaineType[index].heure_pause_debut = newValue;
                                  const heuresCalc = calculerHeuresTravail(
                                    newSemaineType[index].heure_debut,
                                    newSemaineType[index].heure_pause_debut,
                                    newSemaineType[index].heure_pause_fin,
                                    newSemaineType[index].heure_fin
                                  );
                                  newSemaineType[index].heures_travail = heuresCalc;
                                  newSemaineType[index].heures_travail_display = decimalToTime(heuresCalc);
                                  setSemaineType(newSemaineType);
                                }}
                                className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Début"
                                title="Début de la pause"
                              />
                              <input
                                type="time"
                                value={jour.heure_pause_fin}
                                onChange={(e) => {
                                  const newValue = e.target.value || "13:00";
                                  const newSemaineType = [...semaineType];
                                  
                                  // Appliquer aux jours sélectionnés
                                  joursSelectionnes.forEach((jourSemaine) => {
                                    const idx = semaineType.findIndex(j => j.jour_semaine === jourSemaine);
                                    if (idx !== -1 && semaineType[idx].type_jour === "ouvre") {
                                      newSemaineType[idx].heure_pause_fin = newValue;
                                      const heuresCalc = calculerHeuresTravail(
                                        newSemaineType[idx].heure_debut,
                                        newSemaineType[idx].heure_pause_debut,
                                        newSemaineType[idx].heure_pause_fin,
                                        newSemaineType[idx].heure_fin
                                      );
                                      newSemaineType[idx].heures_travail = heuresCalc;
                                      newSemaineType[idx].heures_travail_display = decimalToTime(heuresCalc);
                                    }
                                  });
                                  
                                  // Mettre à jour le jour actuel
                                  newSemaineType[index].heure_pause_fin = newValue;
                                  const heuresCalc = calculerHeuresTravail(
                                    newSemaineType[index].heure_debut,
                                    newSemaineType[index].heure_pause_debut,
                                    newSemaineType[index].heure_pause_fin,
                                    newSemaineType[index].heure_fin
                                  );
                                  newSemaineType[index].heures_travail = heuresCalc;
                                  newSemaineType[index].heures_travail_display = decimalToTime(heuresCalc);
                                  setSemaineType(newSemaineType);
                                }}
                                className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Fin"
                                title="Fin de la pause (reprise)"
                              />
                            </div>
                          </div>
                          
                          {/* Heure de fin */}
                          <div>
                            <label className="text-xs text-gray-600 mb-0.5 block">Fin</label>
                            <input
                              type="time"
                              value={jour.heure_fin}
                              onChange={(e) => {
                                const newValue = e.target.value || "16:00";
                                const newSemaineType = [...semaineType];
                                
                                // Appliquer aux jours sélectionnés
                                joursSelectionnes.forEach((jourSemaine) => {
                                  const idx = semaineType.findIndex(j => j.jour_semaine === jourSemaine);
                                  if (idx !== -1 && semaineType[idx].type_jour === "ouvre") {
                                    newSemaineType[idx].heure_fin = newValue;
                                    const heuresCalc = calculerHeuresTravail(
                                      newSemaineType[idx].heure_debut,
                                      newSemaineType[idx].heure_pause_debut,
                                      newSemaineType[idx].heure_pause_fin,
                                      newSemaineType[idx].heure_fin
                                    );
                                    newSemaineType[idx].heures_travail = heuresCalc;
                                    newSemaineType[idx].heures_travail_display = decimalToTime(heuresCalc);
                                  }
                                });
                                
                                // Mettre à jour le jour actuel
                                newSemaineType[index].heure_fin = newValue;
                                const heuresCalc = calculerHeuresTravail(
                                  newSemaineType[index].heure_debut,
                                  newSemaineType[index].heure_pause_debut,
                                  newSemaineType[index].heure_pause_fin,
                                  newSemaineType[index].heure_fin
                                );
                                newSemaineType[index].heures_travail = heuresCalc;
                                newSemaineType[index].heures_travail_display = decimalToTime(heuresCalc);
                                setSemaineType(newSemaineType);
                              }}
                              className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* Heures travaillées calculées (lecture seule) */}
                          <div className="pt-1 border-t border-gray-200">
                            <div className="text-xs text-gray-600 mb-0.5">Total</div>
                            <div className="text-xs font-semibold text-primary text-center">
                              {jour.heures_travail_display}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-2">
                          Jour chômé
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section Jours fériés */}
              <div className="border-b pb-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Jours Fériés</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Génération automatique pour l'année courante et N+1 (24 mois glissant)
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Les jours fériés français sont générés automatiquement lors de la création du calendrier et mis à jour chaque année.
                  </p>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Génération automatique active</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Année courante : {new Date().getFullYear()} | Année suivante : {new Date().getFullYear() + 1}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Exceptions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">
                      Exceptions ({joursCalendrier.length})
                    </h4>
                    <p className="text-sm text-gray-600">
                      Jours spécifiques qui remplacent la semaine type
                    </p>
                  </div>
                  <button
                    onClick={handleAddJour}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une exception
                  </button>
                </div>
                {joursCalendrier.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      Aucune exception définie pour ce calendrier
                    </p>
                    <button
                      onClick={handleAddJour}
                      className="btn-primary flex items-center gap-2 mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une exception
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {joursCalendrier.map((jour) => (
                      <div
                        key={jour.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium text-gray-700">
                            {new Date(jour.date_jour).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getTypeJourColor(
                              jour.type_jour
                            )}`}
                          >
                            {getTypeJourLabel(jour.type_jour)}
                          </span>
                          {jour.libelle && (
                            <span className="text-sm text-gray-600">{jour.libelle}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {decimalToTime(jour.heures_travail)}
                          </div>
                          {jour.est_recurrent && (
                            <span className="text-xs text-blue-600 font-medium">
                              Récurrent
                            </span>
                          )}
                          <button
                            onClick={() => handleEditJour(jour)}
                            className="text-primary hover:text-primary-dark transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteJour(jour)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition/ajout de jour */}
      {editJourModalOpen && selectedCalendrier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-secondary">
                {selectedJour ? "Modifier le jour" : "Ajouter un jour"}
              </h3>
              <button
                onClick={() => {
                  setEditJourModalOpen(false);
                  setSelectedJour(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={jourFormData.date_jour}
                  onChange={(e) =>
                    setJourFormData({ ...jourFormData, date_jour: e.target.value })
                  }
                  disabled={!!selectedJour}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de jour <span className="text-red-500">*</span>
                </label>
                <select
                  value={jourFormData.type_jour}
                  onChange={(e) =>
                    setJourFormData({
                      ...jourFormData,
                      type_jour: e.target.value as typeof jourFormData.type_jour,
                      heures_travail: e.target.value === "ferie" || e.target.value === "chome" ? "00:00" : jourFormData.heures_travail,
                      heures_travail_decimal: e.target.value === "ferie" || e.target.value === "chome" ? 0 : (jourFormData.heures_travail_decimal || timeToDecimal(jourFormData.heures_travail)),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="ouvre">Jour ouvré</option>
                  <option value="ferie">Jour férié</option>
                  <option value="chome">Jour chômé</option>
                  <option value="reduit">Heures réduites</option>
                  <option value="exceptionnel">Exceptionnel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heures travaillées <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={jourFormData.heures_travail}
                  onChange={(e) => {
                    const timeValue = e.target.value || "00:00";
                    setJourFormData({
                      ...jourFormData,
                      heures_travail: timeValue,
                      heures_travail_decimal: timeToDecimal(timeValue),
                    });
                  }}
                  disabled={jourFormData.type_jour === "ferie" || jourFormData.type_jour === "chome"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format HH:mm (ex: 08:00 pour 8h, 08:30 pour 8h30)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Libellé / Description
                </label>
                <input
                  type="text"
                  value={jourFormData.libelle}
                  onChange={(e) =>
                    setJourFormData({ ...jourFormData, libelle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Ex: Jour de l'an, Pont de l'Ascension..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="est_recurrent"
                  checked={jourFormData.est_recurrent}
                  onChange={(e) =>
                    setJourFormData({ ...jourFormData, est_recurrent: e.target.checked })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="est_recurrent" className="text-sm font-medium text-gray-700">
                  Jour récurrent (se répète chaque année)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setEditJourModalOpen(false);
                  setSelectedJour(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveJour}
                disabled={loading || !jourFormData.date_jour}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? "Enregistrement..." : selectedJour ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Semaine Type - Désactivé, édition directe dans le modal principal */}
      {false && semaineTypeModalOpen && selectedCalendrier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-secondary">
                Configuration Semaine Type
              </h3>
              <button
                onClick={() => {
                  setSemaineTypeModalOpen(false);
                  setJoursSelectionnes(new Set()); // Réinitialiser la sélection
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {semaineType.map((jour, index) => (
                  <div
                    key={jour.jour_semaine}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="w-20 text-xs font-medium text-gray-700">
                      {jour.nom_jour}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">
                        Type de jour
                      </label>
                      <select
                        value={jour.type_jour}
                        onChange={(e) => {
                          const newSemaineType = [...semaineType];
                          newSemaineType[index].type_jour = e.target.value;
                          if (e.target.value === "chome" || e.target.value === "ferie") {
                            newSemaineType[index].heures_travail = 0;
                            newSemaineType[index].heures_travail_display = "00:00";
                          }
                          setSemaineType(newSemaineType);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-xs"
                      >
                        <option value="ouvre">Jour ouvré</option>
                        <option value="chome">Jour chômé</option>
                        <option value="ferie">Jour férié</option>
                        <option value="reduit">Heures réduites</option>
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-gray-600 mb-1">
                        Heures
                      </label>
                      <input
                        type="time"
                        value={jour.heures_travail_display}
                        onChange={(e) => {
                          const newSemaineType = [...semaineType];
                          const timeValue = e.target.value || "00:00";
                          newSemaineType[index].heures_travail_display = timeValue;
                          newSemaineType[index].heures_travail = timeToDecimal(timeValue);
                          setSemaineType(newSemaineType);
                        }}
                        disabled={jour.type_jour === "chome" || jour.type_jour === "ferie"}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setSemaineTypeModalOpen(false);
                  setJoursSelectionnes(new Set()); // Réinitialiser la sélection
                }}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveSemaineType}
                disabled={loading}
                className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5"
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

