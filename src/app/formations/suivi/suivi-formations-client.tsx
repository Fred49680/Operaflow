"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, DollarSign, BarChart3 } from "lucide-react";
import Link from "next/link";

interface AlerteFormation {
  id: string;
  collaborateur_id: string;
  collaborateur_nom: string;
  collaborateur_prenom: string;
  formation_libelle?: string | null;
  catalogue_formation_nom?: string | null;
  date_echeance_validite: string;
  statut_alerte: string;
  jours_restants: number | null;
}

interface SuiviFormationsClientProps {
  initialAlertes: AlerteFormation[];
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
}

export default function SuiviFormationsClient({
  initialAlertes,
}: SuiviFormationsClientProps) {
  const [stats, setStats] = useState<{
    annee: number;
    total_formations_terminees: number;
    budget_consomme: number;
    budget_previsionnel: number;
    taux_conformite: number;
    alertes_expirees: number;
    alertes_imminentes: number;
    alertes_proches: number;
    repartition_categorie: Record<string, number>;
    plan_previsionnel: {
      total: number;
      en_attente: number;
      valide: number;
    };
    alertes_detail: AlerteFormation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    annee: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.annee) params.append("annee", filters.annee);

      const response = await fetch(`/api/formations/suivi/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Erreur récupération stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlertes = initialAlertes.filter(a => {
    const year = new Date(a.date_echeance_validite).getFullYear();
    return year === parseInt(filters.annee);
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
            Pilotage des Formations
          </h1>
          <p className="text-base sm:text-lg text-secondary">
            Tableau de bord et suivi des formations
          </p>
        </div>

        {/* Filtre année */}
        <div className="card mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Année :</label>
            <select
              value={filters.annee}
              onChange={(e) => setFilters({ ...filters, annee: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : stats ? (
          <>
            {/* Indicateurs principaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="card border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Taux de conformité</p>
                    <p className="text-2xl font-bold text-green-600">{stats.taux_conformite}%</p>
                  </div>
                </div>
              </div>

              <div className="card border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Budget consommé</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.budget_consomme.toFixed(0)} €</p>
                    {stats.budget_previsionnel > 0 && (
                      <p className="text-xs text-gray-500">
                        sur {stats.budget_previsionnel.toFixed(0)} € prévu
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="card border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Échéances proches</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.alertes_proches + stats.alertes_imminentes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Formations expirées</p>
                    <p className="text-2xl font-bold text-red-600">{stats.alertes_expirees}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alertes */}
            <div className="card mb-6">
              <h2 className="text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Alertes d&apos;échéance
              </h2>
              {filteredAlertes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune alerte</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                          Collaborateur
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                          Formation
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden md:table-cell">
                          Échéance
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAlertes.map((alerte) => (
                        <tr key={alerte.id} className="hover:bg-primary/5 transition-colors duration-150">
                          <td className="px-3 sm:px-6 py-4">
                            <Link
                              href={`/rh/${alerte.collaborateur_id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {alerte.collaborateur_prenom} {alerte.collaborateur_nom}
                            </Link>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                            {alerte.formation_libelle || alerte.catalogue_formation_nom}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                            {new Date(alerte.date_echeance_validite).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              alerte.statut_alerte === 'expiree' ? 'bg-red-100 text-red-800' :
                              alerte.statut_alerte === 'echeance_imminente' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alerte.statut_alerte === 'expiree' ? 'Expirée' :
                               alerte.statut_alerte === 'echeance_imminente' ? 'Imminente' :
                               `${alerte.jours_restants} jours restants`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Répartition par catégorie */}
            {Object.keys(stats.repartition_categorie).length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-secondary mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Répartition par catégorie
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(stats.repartition_categorie).map(([categorie, count]) => (
                    <div key={categorie} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">{categorie}</div>
                      <div className="text-2xl font-bold text-primary">{count as number}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <p className="text-gray-500 text-center py-8">Erreur lors du chargement des statistiques</p>
          </div>
        )}
      </div>
    </div>
  );
}

