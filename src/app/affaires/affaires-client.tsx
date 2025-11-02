"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Eye, Search } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffairesClientProps {
  initialAffaires: Affaire[];
  sites?: Array<{ site_id: string; site_code: string; site_label: string }>;
  collaborateurs?: Array<{ id: string; nom: string; prenom: string }>;
}

export default function AffairesClient({
  initialAffaires,
  sites: _sites,
  collaborateurs: _collaborateurs,
}: AffairesClientProps) {
  const router = useRouter();
  const [affaires] = useState(initialAffaires);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    statut: "",
    site: "",
    type_valorisation: "",
  });

  // Filtrage et recherche
  const filteredAffaires = useMemo(() => {
    return affaires.filter((affaire) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !affaire.numero.toLowerCase().includes(searchLower) &&
          !affaire.libelle.toLowerCase().includes(searchLower) &&
          !affaire.client?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.statut && affaire.statut !== filters.statut) return false;
      if (filters.site && affaire.site_id !== filters.site) return false;
      if (filters.type_valorisation && affaire.type_valorisation !== filters.type_valorisation) return false;
      return true;
    });
  }, [affaires, searchTerm, filters]);

  // Statistiques
  const stats = useMemo(() => {
    const filtered = filteredAffaires;
    return {
      total: filtered.length,
      en_cours: filtered.filter((a) => a.statut === "en_cours").length,
      planifie: filtered.filter((a) => a.statut === "planifie").length,
      termine: filtered.filter((a) => a.statut === "termine").length,
      montant_total: filtered.reduce((sum, a) => sum + (a.montant_total || 0), 0),
    };
  }, [filteredAffaires]);

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      cree: "bg-gray-100 text-gray-800",
      pre_planifie: "bg-blue-100 text-blue-800",
      planifie: "bg-yellow-100 text-yellow-800",
      en_cours: "bg-green-100 text-green-800",
      suspendu: "bg-orange-100 text-orange-800",
      en_cloture: "bg-purple-100 text-purple-800",
      termine: "bg-emerald-100 text-emerald-800",
      archive: "bg-gray-200 text-gray-600",
    };

    const labels: Record<string, string> = {
      cree: "Créée",
      pre_planifie: "Pré-planifiée",
      planifie: "Planifiée",
      en_cours: "En cours",
      suspendu: "Suspendue",
      en_cloture: "En clôture",
      termine: "Terminée",
      archive: "Archivée",
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[statut] || styles.cree}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
              Gestion des Affaires
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Suivi et valorisation des affaires et projets
            </p>
          </div>
          <Link
            href="/affaires/new"
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nouvelle affaire
          </Link>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">En cours</div>
            <div className="text-2xl font-bold text-green-600">{stats.en_cours}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Planifiées</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.planifie}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Terminées</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.termine}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Montant total</div>
            <div className="text-2xl font-bold text-blue-600">{stats.montant_total.toFixed(0)} €</div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-gray-400" />
                <label className="block text-xs font-medium text-gray-700">Recherche</label>
              </div>
              <input
                type="text"
                placeholder="Rechercher par numéro, libellé, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="cree">Créée</option>
                <option value="pre_planifie">Pré-planifiée</option>
                <option value="planifie">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="suspendu">Suspendue</option>
                <option value="en_cloture">En clôture</option>
                <option value="termine">Terminée</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Type valorisation</label>
              <select
                value={filters.type_valorisation}
                onChange={(e) => setFilters({ ...filters, type_valorisation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="BPU">BPU</option>
                <option value="forfait">Forfait</option>
                <option value="dépense">Dépense</option>
                <option value="mixte">Mixte</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des affaires */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Numéro
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Libellé
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    Client
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    Site
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">
                    Montant
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAffaires.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Aucune affaire trouvée
                    </td>
                  </tr>
                ) : (
                  filteredAffaires.map((affaire) => (
                    <tr
                      key={affaire.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/affaires/${affaire.id}`)}
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {affaire.numero}
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{affaire.libelle}</div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {affaire.client && `${affaire.client} • `}
                          {affaire.montant_total ? `${affaire.montant_total.toFixed(0)} €` : ""}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {affaire.client || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {affaire.site?.site_code || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden xl:table-cell">
                        {affaire.montant_total ? `${affaire.montant_total.toFixed(2)} €` : "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {getStatutBadge(affaire.statut)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/affaires/${affaire.id}`}
                            className="text-primary hover:text-primary-dark"
                            title="Voir le détail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/affaires/${affaire.id}`}
                            className="text-primary hover:text-primary-dark"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

