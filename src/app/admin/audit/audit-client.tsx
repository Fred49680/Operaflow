"use client";

import { useState } from "react";
import type { Database } from "@/types/supabase";

type AuditLog = Database["public"]["Tables"]["tbl_audit_log"]["Row"] & {
  tbl_users?: { email: string } | null;
};

interface Props {
  auditLogs: AuditLog[];
}

export default function AuditClient({ auditLogs }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = auditLogs.filter((log) => {
    if (filter !== "all" && log.action !== filter) return false;
    if (
      searchTerm &&
      !log.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.tbl_users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const actionTypes = [
    { value: "all", label: "Toutes les actions" },
    { value: "connexion", label: "Connexions" },
    { value: "deconnexion", label: "Déconnexions" },
    { value: "creation_compte", label: "Créations de compte" },
    { value: "attribution_role", label: "Attributions de rôle" },
    { value: "acceptation_demande", label: "Acceptations de demande" },
    { value: "refus_demande", label: "Refus de demande" },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Journal d&apos;audit
          </h1>
          <p className="text-lg text-secondary">
            Historique complet des actions et événements système
          </p>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Type d&apos;action
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Recherche
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par action ou email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Table des logs */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Date / Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Aucun log trouvé
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(log.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {log.tbl_users?.email || "Système"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {log.type_entite || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {log.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-primary hover:text-primary-dark">
                              Voir détails
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-md">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500 text-center">
            Affichage de {filteredLogs.length} log{filteredLogs.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

