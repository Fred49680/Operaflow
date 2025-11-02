"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, XCircle, FileText, CheckCircle } from "lucide-react";
import type { AlerteDocument } from "@/types/partenaires";

interface AlertesClientProps {
  initialAlertes: AlerteDocument[];
}

export default function AlertesClient({
  initialAlertes,
}: AlertesClientProps) {
  const [filter, setFilter] = useState<"all" | "expire" | "expire_j7" | "expire_j30">("all");

  const filteredAlertes = useMemo(() => {
    if (filter === "all") return initialAlertes;
    return initialAlertes.filter((a) => a.niveau_alerte === filter);
  }, [initialAlertes, filter]);

  const stats = useMemo(() => {
    return {
      total: initialAlertes.length,
      expire: initialAlertes.filter((a) => a.niveau_alerte === "expire").length,
      expire_j7: initialAlertes.filter((a) => a.niveau_alerte === "expire_j7").length,
      expire_j30: initialAlertes.filter((a) => a.niveau_alerte === "expire_j30").length,
    };
  }, [initialAlertes]);

  const getAlerteIcon = (niveau: string) => {
    switch (niveau) {
      case "expire":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "expire_j7":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "expire_j30":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getAlerteBadge = (niveau: string) => {
    const styles: Record<string, string> = {
      expire: "bg-red-100 text-red-800 border-red-200",
      expire_j7: "bg-orange-100 text-orange-800 border-orange-200",
      expire_j30: "bg-yellow-100 text-yellow-800 border-yellow-200",
      valide: "bg-green-100 text-green-800 border-green-200",
    };

    const labels: Record<string, string> = {
      expire: "Expiré",
      expire_j7: "Expire sous 7 jours",
      expire_j30: "Expire sous 30 jours",
      valide: "Valide",
    };

    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${styles[niveau] || styles.valide}`}>
        {labels[niveau] || niveau}
      </span>
    );
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      contrat_cadre: "Contrat cadre",
      devis: "Devis",
      bon_commande: "Bon de commande",
      attestation_urssaf: "Attestation URSSAF",
      attestation_assurance: "Attestation assurance",
      attestation_decennale: "Attestation décennale",
      certificat_qualite: "Certificat qualité",
      certificat_iso: "Certificat ISO",
      fiche_securite: "Fiche sécurité",
      plan_prevention: "Plan de prévention",
      correspondance: "Correspondance",
      autre: "Autre",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
            Alertes Documents Partenaires
          </h1>
          <p className="text-base sm:text-lg text-secondary">
            Suivi des documents arrivant à expiration
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-600">Total alertes</div>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
          </div>
          <div className="card border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Expirés</div>
            <div className="text-2xl font-bold text-red-600">{stats.expire}</div>
          </div>
          <div className="card border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Expire J-7</div>
            <div className="text-2xl font-bold text-orange-600">{stats.expire_j7}</div>
          </div>
          <div className="card border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600">Expire J-30</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.expire_j30}</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Toutes ({stats.total})
            </button>
            <button
              onClick={() => setFilter("expire")}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filter === "expire"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Expirés ({stats.expire})
            </button>
            <button
              onClick={() => setFilter("expire_j7")}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filter === "expire_j7"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              J-7 ({stats.expire_j7})
            </button>
            <button
              onClick={() => setFilter("expire_j30")}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                filter === "expire_j30"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              J-30 ({stats.expire_j30})
            </button>
          </div>
        </div>

        {/* Liste des alertes */}
        <div className="card overflow-hidden">
          {filteredAlertes.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Aucune alerte
              </h2>
              <p className="text-gray-600">
                Tous les documents sont à jour
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alerte</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partenaire</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date expiration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Jours restants</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Site</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAlertes.map((alerte) => (
                    <tr
                      key={alerte.id}
                      className={`hover:bg-gray-50 ${
                        alerte.niveau_alerte === "expire" ? "bg-red-50" :
                        alerte.niveau_alerte === "expire_j7" ? "bg-orange-50" :
                        alerte.niveau_alerte === "expire_j30" ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getAlerteIcon(alerte.niveau_alerte)}
                          {getAlerteBadge(alerte.niveau_alerte)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{alerte.raison_sociale}</div>
                        <div className="text-xs text-gray-500">
                          {alerte.type_partenaire === "client" ? "Client" :
                           alerte.type_partenaire === "fournisseur" ? "Fournisseur" : "Mixte"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{alerte.titre}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                        {getDocumentTypeLabel(alerte.type_document)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {new Date(alerte.date_expiration).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm hidden md:table-cell">
                        <span className={`font-semibold ${
                          alerte.jours_restants < 0 ? "text-red-600" :
                          alerte.jours_restants <= 7 ? "text-orange-600" :
                          alerte.jours_restants <= 30 ? "text-yellow-600" :
                          "text-gray-600"
                        }`}>
                          {alerte.jours_restants < 0
                            ? `Expiré depuis ${Math.abs(alerte.jours_restants)} jours`
                            : `J-${alerte.jours_restants}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm hidden xl:table-cell">
                        {alerte.site_code ? `${alerte.site_code} - ${alerte.site_label}` : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/partenaires/${alerte.partenaire_id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Voir le partenaire
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

