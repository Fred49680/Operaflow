"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Eye, Search } from "lucide-react";
import type { Partenaire } from "@/types/partenaires";

interface PartenairesClientProps {
  initialPartenaires: Partenaire[];
}

export default function PartenairesClient({
  initialPartenaires,
}: PartenairesClientProps) {
  const router = useRouter();
  const [partenaires] = useState(initialPartenaires);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    statut: "",
  });

  // Filtrage et recherche
  const filteredPartenaires = useMemo(() => {
    return partenaires.filter((partenaire) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !partenaire.raison_sociale.toLowerCase().includes(searchLower) &&
          !partenaire.code_interne?.toLowerCase().includes(searchLower) &&
          !partenaire.siret?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.type && partenaire.type_partenaire !== filters.type) return false;
      if (filters.statut && partenaire.statut !== filters.statut) return false;
      return true;
    });
  }, [partenaires, searchTerm, filters]);

  // Statistiques
  const stats = useMemo(() => {
    const filtered = filteredPartenaires;
    return {
      total: filtered.length,
      clients: filtered.filter((p) => p.type_partenaire === "client" || p.type_partenaire === "mixte").length,
      fournisseurs: filtered.filter((p) => p.type_partenaire === "fournisseur" || p.type_partenaire === "mixte").length,
      actifs: filtered.filter((p) => p.statut === "actif").length,
    };
  }, [filteredPartenaires]);

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      client: "bg-blue-100 text-blue-800",
      fournisseur: "bg-green-100 text-green-800",
      mixte: "bg-purple-100 text-purple-800",
    };

    const labels: Record<string, string> = {
      client: "Client",
      fournisseur: "Fournisseur",
      mixte: "Mixte",
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[type] || styles.client}`}>
        {labels[type] || type}
      </span>
    );
  };

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      actif: "bg-green-100 text-green-800",
      inactif: "bg-gray-100 text-gray-800",
      suspendu: "bg-orange-100 text-orange-800",
      archive: "bg-gray-200 text-gray-600",
    };

    const labels: Record<string, string> = {
      actif: "Actif",
      inactif: "Inactif",
      suspendu: "Suspendu",
      archive: "Archivé",
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[statut] || styles.actif}`}>
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
              Gestion des Partenaires
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Clients et Fournisseurs
            </p>
          </div>
          <Link
            href="/admin/partenaires/new"
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nouveau partenaire
          </Link>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Clients</div>
            <div className="text-2xl font-bold text-blue-600">{stats.clients}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Fournisseurs</div>
            <div className="text-2xl font-bold text-green-600">{stats.fournisseurs}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Actifs</div>
            <div className="text-2xl font-bold text-green-600">{stats.actifs}</div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-gray-400" />
                <label className="block text-xs font-medium text-gray-700">Recherche</label>
              </div>
              <input
                type="text"
                placeholder="Rechercher par raison sociale, code interne, SIRET..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="client">Client</option>
                <option value="fournisseur">Fournisseur</option>
                <option value="mixte">Mixte</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Tous</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="suspendu">Suspendu</option>
                <option value="archive">Archivé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des partenaires */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Raison sociale
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    SIRET
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">
                    Contact
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
                {filteredPartenaires.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucun partenaire trouvé
                    </td>
                  </tr>
                ) : (
                  filteredPartenaires.map((partenaire) => (
                    <tr
                      key={partenaire.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/partenaires/${partenaire.id}`)}
                    >
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{partenaire.raison_sociale}</div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {getTypeBadge(partenaire.type_partenaire)}
                          {partenaire.code_interne && ` • ${partenaire.code_interne}`}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {getTypeBadge(partenaire.type_partenaire)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {partenaire.siret || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                        {partenaire.email_principal || partenaire.telephone_principal || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {getStatutBadge(partenaire.statut)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/admin/partenaires/${partenaire.id}`}
                            className="text-primary hover:text-primary-dark"
                            title="Voir le détail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/partenaires/${partenaire.id}/edit`}
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

