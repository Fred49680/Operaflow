"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Save, FileText, Upload, X, Plus, Trash2, FileSpreadsheet, DollarSign, Receipt, FileBarChart, Calendar, AlertCircle } from "lucide-react";
import type { Affaire } from "@/types/affaires";

interface AffaireDetailClientProps {
  affaire: Affaire;
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
  collaborateurs: Array<{ id: string; nom: string; prenom: string }>;
  partenaires?: Array<{ id: string; raison_sociale: string; type_partenaire: string }>;
  canEditPrePlanif?: boolean; // Permissions pour éditer la pré-planification
}

export default function AffaireDetailClient({
  affaire: initialAffaire,
  sites,
  collaborateurs,
  partenaires = [],
  canEditPrePlanif = false,
}: AffaireDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "lots" | "preplanif" | "documents">("general");
  const [isEditing, setIsEditing] = useState(false);
  const [affaire, setAffaire] = useState(initialAffaire);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [editingLot, setEditingLot] = useState<any>(null);
  const [showBpuImportModal, setShowBpuImportModal] = useState(false);
  const [importingBpu, setImportingBpu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // États pour le formulaire de lot
  const [lotFormPourcentage, setLotFormPourcentage] = useState("");
  const [lotFormMontant, setLotFormMontant] = useState("");
  const [lotFormError, setLotFormError] = useState("");
  
  // État pour la pré-planification
  const [isEditingPrePlanif, setIsEditingPrePlanif] = useState(false);
  const [prePlanifData, setPrePlanifData] = useState({
    total_jours_homme: affaire.pre_planif?.total_jours_homme?.toString() || "",
    total_heures: affaire.pre_planif?.total_heures?.toString() || "",
    contraintes_calendrier: affaire.pre_planif?.contraintes_calendrier || "",
    contraintes_techniques: affaire.pre_planif?.contraintes_techniques || "",
    contraintes_rh: affaire.pre_planif?.contraintes_rh || "",
    risques: affaire.pre_planif?.risques || "",
    commentaire: affaire.pre_planif?.commentaire || "",
  });
  const [savingPrePlanif, setSavingPrePlanif] = useState(false);
  const [validatingPrePlanif, setValidatingPrePlanif] = useState(false);

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      cree: "bg-gray-100 text-gray-800",
      en_attente_planification: "bg-amber-100 text-amber-800",
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
  // Calculer le montant total de l'affaire
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
              <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
                {affaire.statut === "cree" && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Envoyer à la planification</span>
                    <span className="sm:hidden">Envoyer</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Modal de confirmation */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirmModal(false)}>
              <div className="absolute inset-0 bg-slate-600/40 backdrop-blur-sm" />
              <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-50 border border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Envoyer cette affaire à la planification ?
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Elle sera visible par les planificateurs et pourra être planifiée dans le Gantt.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={async () => {
                          setShowConfirmModal(false);
                          setLoading(true);
                          try {
                            const response = await fetch(`/api/affaires/${affaire.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ statut: "en_attente_planification" }),
                            });

                            if (response.ok) {
                              const updated = await response.json();
                              setAffaire(updated.affaire || updated);
                              router.refresh();
                            } else {
                              throw new Error("Erreur lors de l'envoi");
                            }
                          } catch (error) {
                            console.error("Erreur:", error);
                            setLoading(false);
                          }
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-medium"
                      >
                        Confirmer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Onglets */}

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

              {/* Section Valorisation intégrée */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-semibold text-secondary mb-4">Valorisation</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de valorisation
                  </label>
                  {isEditing ? (
                    <select
                      name="type_valorisation"
                      value={affaire.type_valorisation || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="BPU">BPU (Bordereau de Prix Unitaires)</option>
                      <option value="forfait">Forfait</option>
                      <option value="dépense">Dépense</option>
                      <option value="mixte">Mixte (BPU + Dépense)</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded">
                      {affaire.type_valorisation || "Non défini"}
                    </div>
                  )}
                </div>

                {/* BPU Section */}
                {(affaire.type_valorisation === "BPU" || affaire.type_valorisation === "mixte") && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold mb-3">Bordereau de Prix Unitaires</h3>
                      {isEditing && (
                        <button
                          onClick={() => setShowBpuImportModal(true)}
                          className="btn-secondary flex items-center gap-2 text-sm"
                          type="button"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Importer depuis Excel
                        </button>
                      )}
                    </div>
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
                      <div className="text-center py-8 border border-gray-200 rounded-lg">
                        <p className="text-gray-500 mb-4">Aucune ligne BPU</p>
                        {isEditing && (
                          <button
                            onClick={() => setShowBpuImportModal(true)}
                            className="btn-primary inline-flex items-center gap-2"
                            type="button"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Importer depuis Excel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dépenses Section */}
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
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant forfaitaire
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="montant_total"
                        value={affaire.montant_total || ""}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 rounded">
                        {affaire.montant_total ? `${affaire.montant_total.toFixed(2)} €` : "-"}
                      </div>
                    )}
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
          </div>
        )}


        {/* Onglet Lots */}
        {activeTab === "lots" && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary">Découpage par lots / Jalons</h2>
              <button
                onClick={() => {
                  setEditingLot(null);
                  setShowLotModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un lot
              </button>
            </div>
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
                          <tr
                            key={lot.id}
                            onClick={() => {
                              setEditingLot(lot);
                              setShowLotModal(true);
                            }}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                          >
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
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Aucun lot défini pour cette affaire</p>
                <button
                  onClick={() => {
                    setEditingLot(null);
                    setShowLotModal(true);
                  }}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un lot
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Lot */}
        {showLotModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-secondary">
                  {editingLot ? "Modifier le lot" : "Ajouter un lot"}
                </h3>
                <button
                  onClick={() => {
                    setShowLotModal(false);
                    setEditingLot(null);
                    setLotFormPourcentage("");
                    setLotFormMontant("");
                    setLotFormError("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Calculer les totaux des lots existants (sans le lot en cours d'édition)
                  const lotsExistants = affaire.lots || [];
                  const lotsAutres = editingLot 
                    ? lotsExistants.filter(l => l.id !== editingLot.id)
                    : lotsExistants;
                  
                  const totalPourcentageAutres = lotsAutres.reduce((sum, l) => sum + l.pourcentage_total, 0);
                  const totalMontantAutres = lotsAutres.reduce((sum, l) => sum + (l.montant_alloue || 0), 0);
                  
                  const pourcentage = parseFloat(lotFormPourcentage) || 0;
                  const montant = parseFloat(lotFormMontant) || 0;
                  
                  // Vérifier le total des pourcentages
                  const totalPourcentage = totalPourcentageAutres + pourcentage;
                  if (totalPourcentage > 100) {
                    setLotFormError(`Le total des pourcentages (${totalPourcentage.toFixed(2)}%) dépasse 100%. Maximum autorisé : ${(100 - totalPourcentageAutres).toFixed(2)}%`);
                    return;
                  }
                  
                  // Vérifier le total des montants si valorisation en euro
                  if (affaire.type_valorisation && (affaire.type_valorisation === "forfait" || affaire.type_valorisation === "dépense" || affaire.type_valorisation === "mixte")) {
                    const totalMontant = totalMontantAutres + montant;
                    if (totalMontant > montantTotalCalcule) {
                      setLotFormError(`Le total des montants alloués (${totalMontant.toFixed(2)} €) dépasse le montant total de l'affaire (${montantTotalCalcule.toFixed(2)} €). Maximum autorisé : ${(montantTotalCalcule - totalMontantAutres).toFixed(2)} €`);
                      return;
                    }
                  }
                  
                  setLotFormError("");
                  setLoading(true);
                  
                  try {
                    const formData = new FormData(e.currentTarget);
                    const lotData = {
                      numero_lot: formData.get("numero_lot") as string,
                      libelle_lot: formData.get("libelle_lot") as string,
                      description: formData.get("description") as string || null,
                      pourcentage_total: pourcentage,
                      montant_alloue: lotFormMontant ? montant : null,
                      est_jalon_gantt: formData.get("est_jalon_gantt") === "on",
                      date_debut_previsionnelle: formData.get("date_debut_previsionnelle") as string || null,
                      date_fin_previsionnelle: formData.get("date_fin_previsionnelle") as string || null,
                      ordre_affichage: formData.get("ordre_affichage") ? parseInt(formData.get("ordre_affichage") as string) : null,
                    };

                    let response;
                    if (editingLot) {
                      // Mise à jour
                      response = await fetch(`/api/affaires/${affaire.id}/lots/${editingLot.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(lotData),
                      });
                    } else {
                      // Création
                      response = await fetch(`/api/affaires/${affaire.id}/lots`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(lotData),
                      });
                    }
                    
                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || "Erreur lors de la sauvegarde");
                    }
                    
                    router.refresh();
                    setShowLotModal(false);
                    setEditingLot(null);
                    setLotFormPourcentage("");
                    setLotFormMontant("");
                    setLotFormError("");
                    window.location.reload();
                  } catch (error) {
                    console.error("Erreur sauvegarde lot:", error);
                    alert(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro du lot <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="numero_lot"
                      required
                      defaultValue={editingLot?.numero_lot || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      name="ordre_affichage"
                      min="0"
                      defaultValue={editingLot?.ordre_affichage || ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé du lot <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="libelle_lot"
                    required
                    defaultValue={editingLot?.libelle_lot || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingLot?.description || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {(() => {
                  // Calculer les totaux des lots existants (sans le lot en cours d'édition)
                  const lotsExistants = affaire.lots || [];
                  const lotsAutres = editingLot 
                    ? lotsExistants.filter(l => l.id !== editingLot.id)
                    : lotsExistants;
                  
                  const totalPourcentageAutres = lotsAutres.reduce((sum, l) => sum + l.pourcentage_total, 0);
                  const totalMontantAutres = lotsAutres.reduce((sum, l) => sum + (l.montant_alloue || 0), 0);
                  
                  // Initialiser les valeurs si le modal vient d'être ouvert avec un lot existant
                  const currentPourcentage = lotFormPourcentage || editingLot?.pourcentage_total?.toString() || "";
                  const currentMontant = lotFormMontant || editingLot?.montant_alloue?.toString() || "";
                  
                  // Fonction pour calculer le montant à partir du pourcentage
                  const handlePourcentageChange = (value: string) => {
                    setLotFormPourcentage(value);
                    const pourcentage = parseFloat(value) || 0;
                    
                    if (pourcentage > 0 && montantTotalCalcule > 0) {
                      const montantCalcule = (montantTotalCalcule * pourcentage) / 100;
                      setLotFormMontant(montantCalcule.toFixed(2));
                    } else {
                      setLotFormMontant("");
                    }
                    
                    setLotFormError("");
                  };
                  
                  // Fonction pour calculer le pourcentage à partir du montant
                  const handleMontantChange = (value: string) => {
                    setLotFormMontant(value);
                    const montant = parseFloat(value) || 0;
                    
                    if (montant > 0 && montantTotalCalcule > 0) {
                      const pourcentageCalcule = (montant * 100) / montantTotalCalcule;
                      setLotFormPourcentage(pourcentageCalcule.toFixed(2));
                    } else {
                      setLotFormPourcentage("");
                    }
                    
                    setLotFormError("");
                  };
                  
                  return (
                    <>
                      {/* Affichage des totaux existants */}
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Total pourcentages autres lots :</span>
                            <span className="font-semibold">{totalPourcentageAutres.toFixed(2)}%</span>
                          </div>
                          {affaire.type_valorisation && (affaire.type_valorisation === "forfait" || affaire.type_valorisation === "dépense" || affaire.type_valorisation === "mixte") && (
                            <div className="flex justify-between">
                              <span>Total montants autres lots :</span>
                              <span className="font-semibold">{totalMontantAutres.toFixed(2)} €</span>
                            </div>
                          )}
                          <div className="flex justify-between text-primary font-semibold border-t pt-1 mt-1">
                            <span>Montant total affaire :</span>
                            <span>{montantTotalCalcule.toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>

                      {lotFormError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-red-800">{lotFormError}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pourcentage du total <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            max={100 - totalPourcentageAutres}
                            step="0.01"
                            value={currentPourcentage}
                            onChange={(e) => handlePourcentageChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Maximum disponible : {(100 - totalPourcentageAutres).toFixed(2)}%
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Montant alloué (€)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentMontant}
                            onChange={(e) => handleMontantChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {affaire.type_valorisation && (affaire.type_valorisation === "forfait" || affaire.type_valorisation === "dépense" || affaire.type_valorisation === "mixte") && (
                              <>Maximum disponible : {(montantTotalCalcule - totalMontantAutres).toFixed(2)} €</>
                            )}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début prévisionnelle
                    </label>
                    <input
                      type="date"
                      name="date_debut_previsionnelle"
                      defaultValue={editingLot?.date_debut_previsionnelle ? editingLot.date_debut_previsionnelle.split('T')[0] : ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin prévisionnelle
                    </label>
                    <input
                      type="date"
                      name="date_fin_previsionnelle"
                      defaultValue={editingLot?.date_fin_previsionnelle ? editingLot.date_fin_previsionnelle.split('T')[0] : ""}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="est_jalon_gantt"
                      defaultChecked={editingLot?.est_jalon_gantt || false}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Jalon pour le diagramme de Gantt</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLotModal(false);
                      setEditingLot(null);
                      setLotFormPourcentage("");
                      setLotFormMontant("");
                      setLotFormError("");
                    }}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {editingLot ? "Modifier" : "Ajouter"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Onglet Pré-planification */}
        {activeTab === "preplanif" && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary">Pré-planification</h2>
              {canEditPrePlanif && !isEditingPrePlanif && (
                <button
                  onClick={() => setIsEditingPrePlanif(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Modifier
                </button>
              )}
            </div>

            {affaire.pre_planif?.valide_par && affaire.pre_planif?.date_validation && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Pré-planification validée le</span>{" "}
                  {new Date(affaire.pre_planif.date_validation).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}

            {isEditingPrePlanif ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingPrePlanif(true);
                  try {
                    const response = await fetch(`/api/affaires/${affaire.id}/pre-planif`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(prePlanifData),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || "Erreur lors de la sauvegarde");
                    }

                    const updatedPrePlanif = await response.json();
                    
                    // Mettre à jour l'affaire avec la nouvelle pré-planification
                    setAffaire({
                      ...affaire,
                      pre_planif: updatedPrePlanif,
                    });

                    setIsEditingPrePlanif(false);
                    router.refresh();
                  } catch (error) {
                    console.error("Erreur sauvegarde pré-planif:", error);
                    alert(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
                  } finally {
                    setSavingPrePlanif(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total jours-homme
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={prePlanifData.total_jours_homme}
                      onChange={(e) =>
                        setPrePlanifData({ ...prePlanifData, total_jours_homme: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total heures
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={prePlanifData.total_heures}
                      onChange={(e) =>
                        setPrePlanifData({ ...prePlanifData, total_heures: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraintes calendrier
                  </label>
                  <textarea
                    value={prePlanifData.contraintes_calendrier}
                    onChange={(e) =>
                      setPrePlanifData({ ...prePlanifData, contraintes_calendrier: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Dates bloquantes, disponibilités..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraintes techniques
                  </label>
                  <textarea
                    value={prePlanifData.contraintes_techniques}
                    onChange={(e) =>
                      setPrePlanifData({ ...prePlanifData, contraintes_techniques: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Contraintes matérielles, environnementales..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraintes RH
                  </label>
                  <textarea
                    value={prePlanifData.contraintes_rh}
                    onChange={(e) =>
                      setPrePlanifData({ ...prePlanifData, contraintes_rh: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Absences prévues, formations, habilitations..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risques identifiés
                  </label>
                  <textarea
                    value={prePlanifData.risques}
                    onChange={(e) =>
                      setPrePlanifData({ ...prePlanifData, risques: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Risques potentiels..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaire
                  </label>
                  <textarea
                    value={prePlanifData.commentaire}
                    onChange={(e) =>
                      setPrePlanifData({ ...prePlanifData, commentaire: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Commentaires généraux..."
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPrePlanif(false);
                      // Réinitialiser les données
                      setPrePlanifData({
                        total_jours_homme: affaire.pre_planif?.total_jours_homme?.toString() || "",
                        total_heures: affaire.pre_planif?.total_heures?.toString() || "",
                        contraintes_calendrier: affaire.pre_planif?.contraintes_calendrier || "",
                        contraintes_techniques: affaire.pre_planif?.contraintes_techniques || "",
                        contraintes_rh: affaire.pre_planif?.contraintes_rh || "",
                        risques: affaire.pre_planif?.risques || "",
                        commentaire: affaire.pre_planif?.commentaire || "",
                      });
                    }}
                    className="btn-secondary"
                    disabled={savingPrePlanif}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-2"
                    disabled={savingPrePlanif}
                  >
                    <Save className="h-4 w-4" />
                    {savingPrePlanif ? "Sauvegarde..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {affaire.pre_planif ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total jours-homme
                        </label>
                        <div className="px-3 py-2 bg-gray-50 rounded">
                          {affaire.pre_planif.total_jours_homme || "-"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total heures
                        </label>
                        <div className="px-3 py-2 bg-gray-50 rounded">
                          {affaire.pre_planif.total_heures || "-"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraintes calendrier
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                        {affaire.pre_planif.contraintes_calendrier || "Aucune"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraintes techniques
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                        {affaire.pre_planif.contraintes_techniques || "Aucune"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contraintes RH
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                        {affaire.pre_planif.contraintes_rh || "Aucune"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Risques identifiés
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                        {affaire.pre_planif.risques || "Aucun"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commentaire
                      </label>
                      <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                        {affaire.pre_planif.commentaire || "Aucun"}
                      </div>
                    </div>
                    {canEditPrePlanif && !affaire.pre_planif.valide_par && (
                      <div className="flex justify-end pt-4 border-t">
                        <button
                          onClick={async () => {
                            if (!confirm("Confirmer la validation de la pré-planification ? Cette action changera le statut de l'affaire à 'Pré-planifiée'.")) {
                              return;
                            }
                            setValidatingPrePlanif(true);
                            try {
                              const response = await fetch(
                                `/api/affaires/${affaire.id}/pre-planif/validate`,
                                {
                                  method: "POST",
                                }
                              );

                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.error || "Erreur lors de la validation");
                              }

                              alert("Pré-planification validée avec succès !");
                              router.refresh();
                              window.location.reload();
                            } catch (error) {
                              console.error("Erreur validation pré-planif:", error);
                              alert(error instanceof Error ? error.message : "Erreur lors de la validation");
                            } finally {
                              setValidatingPrePlanif(false);
                            }
                          }}
                          className="btn-primary flex items-center gap-2"
                          disabled={validatingPrePlanif}
                        >
                          {validatingPrePlanif ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Validation...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Valider la pré-planification
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      Aucune pré-planification disponible
                    </p>
                    {canEditPrePlanif && (
                      <button
                        onClick={() => setIsEditingPrePlanif(true)}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Créer une pré-planification
                      </button>
                    )}
                  </div>
                )}
              </div>
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

          {/* Modal Import BPU */}
          {showBpuImportModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b">
                  <h3 className="text-lg font-semibold text-secondary">Importer BPU depuis Excel</h3>
                  <button
                    onClick={() => setShowBpuImportModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setImportingBpu(true);
                    try {
                      const formData = new FormData(e.currentTarget);
                      const file = formData.get("file") as File;

                      if (!file) {
                        alert("Veuillez sélectionner un fichier Excel.");
                        setImportingBpu(false);
                        return;
                      }

                      const importFormData = new FormData();
                      importFormData.append("file", file);

                      const response = await fetch(`/api/affaires/${affaire.id}/bpu/import`, {
                        method: "POST",
                        body: importFormData,
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || "Erreur lors de l'importation du BPU.");
                      }

                      const result = await response.json();
                      alert(`BPU importé avec succès ! ${result.count || 0} ligne(s) importée(s).`);
                      router.refresh();
                      setShowBpuImportModal(false);
                      window.location.reload(); // Recharger pour voir les nouvelles données
                    } catch (error) {
                      console.error("Erreur importation BPU:", error);
                      alert(error instanceof Error ? error.message : "Erreur lors de l'importation du BPU.");
                    } finally {
                      setImportingBpu(false);
                    }
                  }}
                  className="p-6 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fichier Excel (.xlsx, .xls, .csv) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      name="file"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      accept=".xlsx,.xls,.csv"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Colonnes attendues : "Code BPU", "Libellé", "Unité", "PU", "Quantité".
                      Les noms de colonnes sont détectés automatiquement.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowBpuImportModal(false)}
                      className="btn-secondary"
                      disabled={importingBpu}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex items-center gap-2"
                      disabled={importingBpu}
                    >
                      {importingBpu ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Importation...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4" />
                          Importer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
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

