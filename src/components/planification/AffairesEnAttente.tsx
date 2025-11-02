"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffairesEnAttenteProps {
  userId?: string;
}

export default function AffairesEnAttente({ userId }: AffairesEnAttenteProps) {
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
        router.refresh();
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

  return (
    <div className="card border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-amber-600" />
        <h4 className="text-lg font-semibold text-amber-900">
          Affaires en attente de planification ({affaires.length})
        </h4>
      </div>

      <div className="space-y-3">
        {affaires.map((affaire) => (
          <div
            key={affaire.id}
            className="bg-white rounded-lg p-4 border border-amber-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-semibold text-secondary">
                    {affaire.numero} - {affaire.libelle}
                  </h5>
                </div>
                {affaire.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{affaire.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {affaire.site && (
                    <span>Site: {typeof affaire.site === 'object' ? affaire.site.site_label : affaire.site}</span>
                  )}
                  {affaire.charge_affaires && (
                    <span>
                      Chargé d'affaires: {affaire.charge_affaires.prenom} {affaire.charge_affaires.nom}
                    </span>
                  )}
                  {affaire.date_debut && (
                    <span>Début: {new Date(affaire.date_debut).toLocaleDateString("fr-FR")}</span>
                  )}
                  {affaire.montant_total && (
                    <span>Montant: {affaire.montant_total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAccept(affaire.id)}
                  disabled={processingId === affaire.id}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  Accepter
                </button>
                <button
                  onClick={() => handleReject(affaire.id)}
                  disabled={processingId === affaire.id}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                >
                  <XCircle className="h-4 w-4" />
                  Refuser
                </button>
                <a
                  href={`/affaires/${affaire.id}`}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm"
                >
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

