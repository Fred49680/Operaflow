"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, XCircle, Eye, Calendar, DollarSign, MapPin, User } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffairesEnAttenteProps {
  userId?: string;
  onCreateActivite?: (affaireId: string) => void;
}

export default function AffairesEnAttente({ userId, onCreateActivite }: AffairesEnAttenteProps) {
  const router = useRouter();
  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAffaires();
  }, []);

  const fetchAffaires = async () => {
    try {
      const response = await fetch("/api/affaires?statut=en_attente_planification");
      if (response.ok) {
        const data = await response.json();
        setAffaires(data.affaires || []);
      }
    } catch (error) {
      console.error("Erreur récupération affaires en attente:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (affaireId: string) => {
    setProcessingId(affaireId);
    try {
      const response = await fetch(`/api/affaires/${affaireId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "planifie" }),
      });

      if (response.ok) {
        await fetchAffaires();
        // Rafraîchir la page pour mettre à jour les activités et affaires planifiées
        window.location.reload();
      } else {
        alert("Erreur lors de l'acceptation");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'acceptation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (affaireId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir refuser cette demande de planification ?")) {
      return;
    }
    setProcessingId(affaireId);
    try {
      const response = await fetch(`/api/affaires/${affaireId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "cree" }),
      });

      if (response.ok) {
        await fetchAffaires();
        router.refresh();
      } else {
        alert("Erreur lors du refus");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du refus");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (affaires.length === 0) {
    return null;
  }

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      cree: "bg-gray-100 text-gray-800",
      en_attente_planification: "bg-amber-100 text-amber-800 border-amber-300",
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
      en_attente_planification: "En attente de planification",
      pre_planifie: "Pré-planifiée",
      planifie: "Planifiée",
      en_cours: "En cours",
      suspendu: "Suspendue",
      en_cloture: "En clôture",
      termine: "Terminée",
      archive: "Archivée",
    };

    return (
      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[statut] || styles.cree}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  return (
    <div className="card border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-secondary">
            Affaires en attente de planification
          </h4>
          <p className="text-sm text-gray-600">
            {affaires.length} affaire{affaires.length > 1 ? "s" : ""} requiert{affaires.length > 1 ? "ent" : ""} votre attention
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {affaires.map((affaire) => (
          <div
            key={affaire.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-5">
              {/* En-tête avec numéro, libellé et statut */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h5 className="text-lg font-bold text-primary">
                      {affaire.numero}
                    </h5>
                    <h6 className="text-base font-semibold text-secondary flex-1 min-w-[200px]">
                      {affaire.libelle}
                    </h6>
                    {getStatutBadge(affaire.statut)}
                  </div>
                  {affaire.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{affaire.description}</p>
                  )}
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {affaire.site && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-500">Site</span>
                      <p className="font-medium text-gray-700">
                        {typeof affaire.site === 'object' ? affaire.site.site_label : affaire.site}
                      </p>
                    </div>
                  </div>
                )}
                {affaire.charge_affaires && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-500">Chargé d'affaires</span>
                      <p className="font-medium text-gray-700">
                        {affaire.charge_affaires.prenom} {affaire.charge_affaires.nom}
                      </p>
                    </div>
                  </div>
                )}
                {affaire.date_debut && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-500">Date début</span>
                      <p className="font-medium text-gray-700">
                        {new Date(affaire.date_debut).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                )}
                {affaire.montant_total && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-500">Montant</span>
                      <p className="font-medium text-gray-700">
                        {affaire.montant_total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 flex-wrap">
                <button
                  onClick={() => handleAccept(affaire.id)}
                  disabled={processingId === affaire.id}
                  className="flex-1 min-w-[120px] btn-primary bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="h-4 w-4" />
                  {processingId === affaire.id ? "Traitement..." : "Accepter"}
                </button>
                <button
                  onClick={() => handleReject(affaire.id)}
                  disabled={processingId === affaire.id}
                  className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Refuser
                </button>
                <a
                  href={`/affaires/${affaire.id}`}
                  className="btn-primary flex items-center justify-center gap-2 px-4 py-2 min-w-[80px]"
                >
                  <Eye className="h-4 w-4" />
                  Voir
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

