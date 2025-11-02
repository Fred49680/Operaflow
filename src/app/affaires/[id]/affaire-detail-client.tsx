"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Save, FileText, Upload, X } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffaireDetailClientProps {
  affaire: Affaire;
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
  collaborateurs: Array<{ id: string; nom: string; prenom: string }>;
  partenaires?: Array<{ id: string; raison_sociale: string; type_partenaire: string }>;
}

export default function AffaireDetailClient({
  affaire: initialAffaire,
  sites,
  collaborateurs,
  partenaires = [],
}: AffaireDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "valorisation" | "lots" | "preplanif" | "documents">("general");
  const [isEditing, setIsEditing] = useState(false);
  const [affaire, setAffaire] = useState(initialAffaire);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${styles[statut] || styles.cree}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  const getPrioriteBadge = (priorite?: string | null) => {
    if (!priorite) return null;

    const styles: Record<string, string> = {
      basse: "bg-gray-100 text-gray-800",
      moyenne: "bg-blue-100 text-blue-800",
      haute: "bg-orange-100 text-orange-800",
      critique: "bg-red-100 text-red-800",
    };

    const labels: Record<string, string> = {
      basse: "Basse",
      moyenne: "Moyenne",
      haute: "Haute",
      critique: "Critique",
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[priorite] || styles.moyenne}`}>
        {labels[priorite] || priorite}
      </span>
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/affaires/${affaire.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(affaire),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      const updated = await response.json();
      setAffaire(updated);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAffaire((prev) => ({ ...prev, [name]: value }));
  };

  // Calculer les totaux
  const totalBPU = affaire.bpu?.reduce((sum, l) => sum + (l.montant_total_ht || 0), 0) || 0;
  const totalDepensesTTC = affaire.depenses?.reduce((sum, d) => sum + (d.montant_ttc || 0), 0) || 0;
  
  // Calculer le montant total selon le type de valorisation
  const montantTotalCalcule = (() => {
    if (!affaire.type_valorisation) return affaire.montant_total || 0;
    
    switch (affaire.type_valorisation) {
      case "BPU":
        return totalBPU;
      case "dépense":
        return totalDepensesTTC;
      case "mixte":
        return totalBPU + totalDepensesTTC;
      case "forfait":
        return affaire.montant_total || 0;
      default:
        return affaire.montant_total || 0;
    }
  })();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/affaires"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                  {affaire.numero} - {affaire.libelle}
                </h1>
                {getStatutBadge(affaire.statut)}
                {getPrioriteBadge(affaire.priorite)}
              </div>
              <p className="text-gray-600">{affaire.description || "Aucune description"}</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary flex items-center gap-2 w-full sm:w-auto"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </button>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Informations générales
            </button>
            <button
              onClick={() => setActiveTab("valorisation")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "valorisation"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Valorisation
            </button>
            <button
              onClick={() => setActiveTab("lots")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "lots"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Lots / Jalons ({affaire.lots?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("preplanif")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "preplanif"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Pré-planification
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "documents"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Documents ({affaire.documents?.length || 0})
            </button>
          </nav>
        </div>

        {/* Onglet Informations générales */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary mb-4">Informations générales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="numero"
                      value={affaire.numero}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">{affaire.numero}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  {isEditing ? (
                    <select
                      name="statut"
                      value={affaire.statut}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="cree">Créée</option>
                      <option value="pre_planifie">Pré-planifiée</option>
                      <option value="planifie">Planifiée</option>
                      <option value="en_cours">En cours</option>
                      <option value="suspendu">Suspendue</option>
                      <option value="en_cloture">En clôture</option>
                      <option value="termine">Terminée</option>
                      <option value="archive">Archivée</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2">{getStatutBadge(affaire.statut)}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="libelle"
                      value={affaire.libelle}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">{affaire.libelle}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  {isEditing ? (
                    <textarea
                      name="description"
                      value={affaire.description || ""}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                      {affaire.description || "Aucune description"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  {isEditing ? (
                    <select
                      name="partenaire_id"
                      value={affaire.partenaire_id || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Sélectionner...</option>
                      {partenaires.map((partenaire) => (
                        <option key={partenaire.id} value={partenaire.id}>
                          {partenaire.raison_sociale}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.partenaire?.raison_sociale || affaire.client || "-"}
                    </div>
                  )}
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chargé d'affaires</label>
                  {isEditing ? (
                    <select
                      name="charge_affaires_id"
                      value={affaire.charge_affaires_id || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Sélectionner...</option>
                      {collaborateurs.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.prenom} {col.nom}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.charge_affaires
                        ? `${affaire.charge_affaires.prenom} ${affaire.charge_affaires.nom}`
                        : "-"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                  {isEditing ? (
                    <select
                      name="site_id"
                      value={affaire.site_id || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Sélectionner...</option>
                      {sites.map((site) => (
                        <option key={site.site_id} value={site.site_id}>
                          {site.site_code} - {site.site_label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.site ? `${affaire.site.site_code} - ${affaire.site.site_label}` : "-"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="date_debut"
                      value={affaire.date_debut || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.date_debut
                        ? new Date(affaire.date_debut).toLocaleDateString("fr-FR")
                        : "-"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="date_fin"
                      value={affaire.date_fin || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.date_fin ? new Date(affaire.date_fin).toLocaleDateString("fr-FR") : "-"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                  {isEditing ? (
                    <select
                      name="priorite"
                      value={affaire.priorite || "moyenne"}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="basse">Basse</option>
                      <option value="moyenne">Moyenne</option>
                      <option value="haute">Haute</option>
                      <option value="critique">Critique</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2">{getPrioriteBadge(affaire.priorite)}</div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary flex items-center gap-2"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4" />
                    {loading ? "Sauvegarde..." : "Enregistrer"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Valorisation */}
        {activeTab === "valorisation" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary mb-4">Valorisation</h2>
              <div className="mb-4">
                <span className="text-sm text-gray-600">Type: </span>
                <span className="font-semibold">{affaire.type_valorisation || "Non défini"}</span>
              </div>

              {affaire.type_valorisation === "BPU" || affaire.type_valorisation === "mixte" ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Bordereau de Prix Unitaires</h3>
                  {affaire.bpu && affaire.bpu.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unité</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {affaire.bpu.map((ligne) => (
                            <tr key={ligne.id}>
                              <td className="px-4 py-3 text-sm">{ligne.code_bpu || "-"}</td>
                              <td className="px-4 py-3 text-sm">{ligne.libelle_bpu}</td>
                              <td className="px-4 py-3 text-sm">{ligne.unite || "-"}</td>
                              <td className="px-4 py-3 text-sm text-right">{ligne.quantite_prevue}</td>
                              <td className="px-4 py-3 text-sm text-right">{ligne.prix_unitaire_ht.toFixed(2)} €</td>
                              <td className="px-4 py-3 text-sm font-semibold text-right">{ligne.montant_total_ht.toFixed(2)} €</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan={5} className="px-4 py-3 text-right">Total BPU HT</td>
                            <td className="px-4 py-3 text-right">{totalBPU.toFixed(2)} €</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucune ligne BPU</p>
                  )}
                </div>
              ) : null}

              {affaire.type_valorisation === "dépense" || affaire.type_valorisation === "mixte" ? (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Dépenses</h3>
                  {affaire.depenses && affaire.depenses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant HT</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TVA</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total TTC</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {affaire.depenses.map((dep) => (
                            <tr key={dep.id}>
                              <td className="px-4 py-3 text-sm">{dep.categorie || "-"}</td>
                              <td className="px-4 py-3 text-sm">{dep.libelle}</td>
                              <td className="px-4 py-3 text-sm text-right">{dep.montant_ht.toFixed(2)} €</td>
                              <td className="px-4 py-3 text-sm text-right">{dep.taux_tva}%</td>
                              <td className="px-4 py-3 text-sm text-right">{dep.montant_ttc.toFixed(2)} €</td>
                              <td className="px-4 py-3 text-sm">
                                {new Date(dep.date_depense).toLocaleDateString("fr-FR")}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan={4} className="px-4 py-3 text-right">Total Dépenses</td>
                            <td className="px-4 py-3 text-right">{totalDepensesTTC.toFixed(2)} €</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucune dépense</p>
                  )}
                </div>
              ) : null}

              {affaire.type_valorisation === "forfait" ? (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Montant forfaitaire</h3>
                  <div className="text-2xl font-bold text-primary">
                    {affaire.montant_total ? `${affaire.montant_total.toFixed(2)} €` : "-"}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Montant total de l'affaire</span>
                  <span className="text-2xl font-bold text-primary">
                    {montantTotalCalcule > 0 ? `${montantTotalCalcule.toFixed(2)} €` : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Lots */}
        {activeTab === "lots" && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary mb-4">Découpage par lots / Jalons</h2>
            {affaire.lots && affaire.lots.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pourcentage</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant alloué</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates prévues</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jalon Gantt</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {affaire.lots
                        .sort((a, b) => (a.ordre_affichage || 0) - (b.ordre_affichage || 0))
                        .map((lot) => (
                          <tr key={lot.id}>
                            <td className="px-4 py-3 text-sm font-medium">{lot.numero_lot}</td>
                            <td className="px-4 py-3 text-sm">
                              <div>{lot.libelle_lot}</div>
                              {lot.description && (
                                <div className="text-xs text-gray-500 mt-1">{lot.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">
                              {lot.pourcentage_total.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-primary">
                              {lot.montant_alloue ? `${lot.montant_alloue.toFixed(2)} €` : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {lot.date_debut_previsionnelle || lot.date_fin_previsionnelle ? (
                                <div>
                                  {lot.date_debut_previsionnelle && (
                                    <div>
                                      Début: {new Date(lot.date_debut_previsionnelle).toLocaleDateString("fr-FR")}
                                    </div>
                                  )}
                                  {lot.date_fin_previsionnelle && (
                                    <div>
                                      Fin: {new Date(lot.date_fin_previsionnelle).toLocaleDateString("fr-FR")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {lot.est_jalon_gantt ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Oui
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                  Non
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={2} className="px-4 py-3 text-right">Total</td>
                        <td className="px-4 py-3 text-right">
                          {affaire.lots.reduce((sum, l) => sum + l.pourcentage_total, 0).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          {affaire.lots.reduce((sum, l) => sum + (l.montant_alloue || 0), 0).toFixed(2)} €
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Total des pourcentages</span>
                      <div className="text-xl font-bold text-primary">
                        {affaire.lots.reduce((sum, l) => sum + l.pourcentage_total, 0).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total montants alloués</span>
                      <div className="text-xl font-bold text-primary">
                        {affaire.lots.reduce((sum, l) => sum + (l.montant_alloue || 0), 0).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Aucun lot défini pour cette affaire</p>
            )}
          </div>
        )}

        {/* Onglet Pré-planification */}
        {activeTab === "preplanif" && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary mb-4">Pré-planification</h2>
            {affaire.pre_planif ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total jours-homme</label>
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.pre_planif.total_jours_homme || "-"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total heures</label>
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.pre_planif.total_heures || "-"}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraintes calendrier</label>
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                    {affaire.pre_planif.contraintes_calendrier || "Aucune"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraintes techniques</label>
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                    {affaire.pre_planif.contraintes_techniques || "Aucune"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraintes RH</label>
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                    {affaire.pre_planif.contraintes_rh || "Aucune"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risques identifiés</label>
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                    {affaire.pre_planif.risques || "Aucun"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                    {affaire.pre_planif.commentaire || "Aucun"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Aucune pré-planification disponible</p>
            )}
          </div>
        )}

        {/* Onglet Documents */}
        {activeTab === "documents" && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary">Documents</h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Téléverser un document
              </button>
            </div>
            
            {affaire.documents && affaire.documents.length > 0 ? (
              <div className="space-y-2">
                {affaire.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{doc.nom_fichier}</div>
                        <div className="text-sm text-gray-500">
                          {doc.type_document || "Document"} •{" "}
                          {doc.taille_octets ? `${(doc.taille_octets / 1024).toFixed(1)} KB` : ""}
                          {doc.created_at && ` • ${new Date(doc.created_at).toLocaleDateString("fr-FR")}`}
                        </div>
                      </div>
                    </div>
                    {doc.url_storage && (
                      <a
                        href={doc.url_storage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        Télécharger
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun document</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Téléverser un document
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Upload Document */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-secondary">Téléverser un document</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setUploading(true);
                  
                  try {
                    const formData = new FormData(e.currentTarget);
                    const file = formData.get("file") as File;
                    const typeDocument = formData.get("type_document") as string;
                    const description = formData.get("description") as string;
                    
                    if (!file) {
                      alert("Veuillez sélectionner un fichier");
                      setUploading(false);
                      return;
                    }
                    
                    // Upload via API
                    const uploadFormData = new FormData();
                    uploadFormData.append("file", file);
                    uploadFormData.append("affaire_id", affaire.id);
                    uploadFormData.append("type_document", typeDocument || "");
                    uploadFormData.append("description", description || "");
                    
                    const response = await fetch(`/api/affaires/${affaire.id}/documents`, {
                      method: "POST",
                      body: uploadFormData,
                    });
                    
                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || "Erreur lors du téléversement");
                    }
                    
                    const result = await response.json();
                    
                    // Rafraîchir la liste des documents
                    router.refresh();
                    setShowUploadModal(false);
                    
                    // Recharger la page pour voir le nouveau document
                    window.location.reload();
                  } catch (error) {
                    console.error("Erreur upload:", error);
                    alert(error instanceof Error ? error.message : "Erreur lors du téléversement");
                  } finally {
                    setUploading(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fichier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    name="file"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, Images (max 50 MB)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de document
                  </label>
                  <select
                    name="type_document"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="devis">Devis</option>
                    <option value="facture">Facture</option>
                    <option value="rapport">Rapport</option>
                    <option value="contrat">Contrat</option>
                    <option value="planning">Planning</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optionnel)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Description du document..."
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="btn-secondary"
                    disabled={uploading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-2"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Téléversement...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Téléverser
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

