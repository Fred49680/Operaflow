"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Eye, MapPin, User, DollarSign } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffairesPlanifieesProps {
  onCreateActivite?: (affaireId: string) => void;
}

export default function AffairesPlanifiees({ onCreateActivite }: AffairesPlanifieesProps) {
  const [affaires, setAffaires] = useState<Affaire[]>([]);
  const [activitesAffaires, setActivitesAffaires] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer les affaires planifiées
      const responseAffaires = await fetch("/api/affaires?statut=planifie");
      if (responseAffaires.ok) {
        const dataAffaires = await responseAffaires.json();
        setAffaires(dataAffaires.affaires || []);
      }

      // Récupérer le nombre d'activités par affaire
      const responseActivites = await fetch("/api/planification/activites");
      if (responseActivites.ok) {
        const dataActivites = await responseActivites.json();
        const counts: Record<string, number> = {};
        (dataActivites.activites || []).forEach((act: any) => {
          counts[act.affaire_id] = (counts[act.affaire_id] || 0) + 1;
        });
        setActivitesAffaires(counts);
      }
    } catch (error) {
      console.error("Erreur récupération affaires planifiées:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      </div>
    );
  }

  // Filtrer les affaires qui n'ont pas encore d'activités
  const affairesSansActivites = affaires.filter((affaire) => !activitesAffaires[affaire.id] || activitesAffaires[affaire.id] === 0);

  if (affairesSansActivites.length === 0) {
    return null;
  }

  return (
    <div className="card border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-secondary">
            Affaires planifiées sans activités
          </h4>
          <p className="text-sm text-gray-600">
            {affairesSansActivites.length} affaire{affairesSansActivites.length > 1 ? "s" : ""} nécessite{affairesSansActivites.length > 1 ? "nt" : ""} la création d'activités
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {affairesSansActivites.map((affaire) => (
          <div
            key={affaire.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="p-5">
              {/* En-tête avec numéro et libellé */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h5 className="text-lg font-bold text-primary">
                      {affaire.numero}
                    </h5>
                    <h6 className="text-base font-semibold text-secondary flex-1 min-w-[200px]">
                      {affaire.libelle}
                    </h6>
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
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => onCreateActivite?.(affaire.id)}
                  className="flex-1 btn-primary bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer une activité
                </button>
                <a
                  href={`/affaires/${affaire.id}`}
                  className="btn-primary flex items-center justify-center gap-2 px-4 py-2"
                >
                  <Eye className="h-4 w-4" />
                  Voir l'affaire
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

