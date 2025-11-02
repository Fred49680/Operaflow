"use client";

import { useState, useEffect } from "react";
import { Calendar, TrendingUp, Clock, Filter, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SuiviAbsencesClientProps {
  initialAbsences: any[];
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
}

export default function SuiviAbsencesClient({
  initialAbsences,
  sites,
}: SuiviAbsencesClientProps) {
  const [absences] = useState(initialAbsences);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    date_debut: "",
    date_fin: "",
    site_id: "",
    statut: "",
  });

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date_debut) params.append("date_debut", filters.date_debut);
      if (filters.date_fin) params.append("date_fin", filters.date_fin);
      if (filters.site_id) params.append("site_id", filters.site_id);

      const response = await fetch(`/api/rh/absences/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Erreur récupération stats:", err);
    }
  };

  const statutLabels: Record<string, string> = {
    en_attente_validation_n1: "En attente N+1",
    validee_n1: "Validée N+1",
    refusee_n1: "Refusée N+1",
    en_attente_validation_rh: "En attente RH",
    validee_rh: "Validée RH",
    appliquee: "Appliquée",
    refusee_rh: "Refusée RH",
    annulee: "Annulée",
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date début
            </label>
            <input
              type="date"
              value={filters.date_debut}
              onChange={(e) =>
                setFilters({ ...filters, date_debut: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date fin
            </label>
            <input
              type="date"
              value={filters.date_fin}
              onChange={(e) =>
                setFilters({ ...filters, date_fin: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site
            </label>
            <select
              value={filters.site_id}
              onChange={(e) =>
                setFilters({ ...filters, site_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Tous les sites</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_code} - {site.site_label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={filters.statut}
              onChange={(e) =>
                setFilters({ ...filters, statut: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(statutLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700">Total absences</h3>
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{stats.total_absences}</p>
          </div>

          <div className="card border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-amber-700">En attente N+1</h3>
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-900">{stats.en_attente_n1}</p>
          </div>

          <div className="card border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-yellow-700">En attente RH</h3>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-yellow-900">{stats.en_attente_rh}</p>
          </div>

          <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700">Jours validés</h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">
              {stats.total_jours_valides.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Liste des absences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Liste des absences</h3>
          <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Collaborateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {absences
                .filter((abs) => {
                  if (filters.statut && abs.statut !== filters.statut) return false;
                  return true;
                })
                .map((abs) => {
                  const badge = statutLabels[abs.statut] || abs.statut;
                  return (
                    <tr key={abs.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {abs.collaborateur?.prenom} {abs.collaborateur?.nom}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {abs.catalogue_absence?.libelle || abs.type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(abs.date_debut), "dd/MM/yyyy", { locale: fr })} -{" "}
                        {format(new Date(abs.date_fin), "dd/MM/yyyy", { locale: fr })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {abs.duree_jours
                          ? `${abs.duree_jours.toFixed(1)}j`
                          : abs.jours_ouvres
                          ? `${abs.jours_ouvres.toFixed(1)}j ouvrés`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {badge}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

