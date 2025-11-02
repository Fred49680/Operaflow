"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, X } from "lucide-react";

interface Partenaire {
  id: string;
  raison_sociale: string;
  type_partenaire: string;
  code_interne?: string | null;
}

interface Contact {
  id: string;
  partenaire_id: string;
  nom: string;
  prenom: string;
  fonction?: string | null;
  email?: string | null;
  statut: string;
  partenaire?: {
    id: string;
    raison_sociale: string;
    sites?: Array<{ site_id: string }>;
  };
}

interface CreateAffaireClientProps {
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
  collaborateurs: Array<{ id: string; nom: string; prenom: string }>;
  partenaires: Partenaire[];
  contacts: Contact[];
}

interface LigneBPU {
  id: string;
  code_bpu?: string;
  libelle_bpu: string;
  description?: string;
  unite?: string;
  quantite_prevue: number;
  prix_unitaire_ht: number;
}

interface Depense {
  id: string;
  categorie?: string;
  libelle: string;
  description?: string;
  montant_ht: number;
  taux_tva: number;
  date_depense: string;
  date_facturation?: string;
  numero_facture?: string;
  fournisseur?: string;
}

interface Lot {
  id: string;
  numero_lot: string;
  libelle_lot: string;
  description?: string;
  pourcentage_total: number;
  est_jalon_gantt: boolean;
  date_debut_previsionnelle?: string;
  date_fin_previsionnelle?: string;
  ordre_affichage?: number;
}

export default function CreateAffaireClient({
  sites,
  collaborateurs,
  partenaires,
  contacts,
}: CreateAffaireClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "bpu" | "depenses" | "lots">("general");

  // État du formulaire
  const [formData, setFormData] = useState({
    numero: "",
    libelle: "",
    description: "",
    partenaire_id: "",
    contact_id: "",
    charge_affaires_id: "",
    site_id: "",
    date_debut: "",
    date_fin: "",
    montant_total: "",
    type_valorisation: "forfait" as "BPU" | "forfait" | "dépense" | "mixte",
    statut: "cree" as const,
    priorite: "moyenne" as "basse" | "moyenne" | "haute" | "critique",
  });

  // Filtrer les contacts selon le partenaire et le site sélectionnés
  const availableContacts = formData.site_id && formData.partenaire_id
    ? contacts.filter((contact) => {
        // Le contact doit appartenir au partenaire sélectionné
        if (contact.partenaire_id !== formData.partenaire_id) return false;
        
        // Vérifier si le partenaire a un site lié correspondant
        const partenaireSites = contact.partenaire?.sites?.map(s => s.site_id) || [];
        return partenaireSites.includes(formData.site_id) || partenaireSites.length === 0;
      })
    : formData.partenaire_id
    ? contacts.filter((contact) => contact.partenaire_id === formData.partenaire_id)
    : [];

  const [bpu, setBpu] = useState<LigneBPU[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);

  // Gérer les changements du formulaire
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Si on change le partenaire, réinitialiser le contact
    if (name === "partenaire_id") {
      setFormData((prev) => ({ ...prev, [name]: value, contact_id: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Gérer les lignes BPU
  const addLigneBPU = () => {
    setBpu([
      ...bpu,
      {
        id: Date.now().toString(),
        code_bpu: "",
        libelle_bpu: "",
        unite: "h",
        quantite_prevue: 0,
        prix_unitaire_ht: 0,
      },
    ]);
  };

  const removeLigneBPU = (id: string) => {
    setBpu(bpu.filter((l) => l.id !== id));
  };

  const updateLigneBPU = (id: string, field: keyof LigneBPU, value: string | number) => {
    setBpu(
      bpu.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  // Gérer les dépenses
  const addDepense = () => {
    setDepenses([
      ...depenses,
      {
        id: Date.now().toString(),
        categorie: "",
        libelle: "",
        montant_ht: 0,
        taux_tva: 20,
        date_depense: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeDepense = (id: string) => {
    setDepenses(depenses.filter((d) => d.id !== id));
  };

  const updateDepense = (id: string, field: keyof Depense, value: string | number) => {
    setDepenses(
      depenses.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // Gérer les lots
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addLot = () => {
    setLots([
      ...lots,
      {
        id: Date.now().toString(),
        numero_lot: `Lot ${lots.length + 1}`,
        libelle_lot: "",
        pourcentage_total: 0,
        est_jalon_gantt: true,
      },
    ]);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeLot = (lotId: string) => {
    setLots(lots.filter((l) => l.id !== lotId));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateLot = (lotId: string, field: keyof Lot, value: string | number | boolean) => {
    setLots(
      lots.map((l) => (l.id === lotId ? { ...l, [field]: value } : l))
    );
  };

  // Calculer le total des pourcentages
  const totalPourcentage = lots.reduce((sum, l) => sum + l.pourcentage_total, 0);

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        ...formData,
        montant_total: formData.montant_total ? parseFloat(formData.montant_total) : null,
        partenaire_id: formData.partenaire_id || null,
        contact_id: formData.contact_id || null,
      };
      
      // Supprimer les champs obsolètes
      delete payload.client;
      delete payload.client_code;

      // Ajouter BPU si nécessaire
      if (formData.type_valorisation === "BPU" || formData.type_valorisation === "mixte") {
        payload.bpu = bpu.map((ligne) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...rest } = ligne;
          return rest;
        });
      }

      // Ajouter dépenses si nécessaire
      if (formData.type_valorisation === "dépense" || formData.type_valorisation === "mixte") {
        payload.depenses = depenses.map((dep) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...rest } = dep;
          return rest;
        });
      }

      // Ajouter les lots
      if (lots.length > 0) {
        // Vérifier que le total ne dépasse pas 100%
        if (totalPourcentage > 100) {
          alert(`Le total des pourcentages des lots ne peut pas dépasser 100% (actuellement: ${totalPourcentage.toFixed(2)}%)`);
          setLoading(false);
          return;
        }
        payload.lots = lots.map((lot) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...rest } = lot;
          return rest;
        });
      }

      const response = await fetch("/api/affaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      const data = await response.json();
      router.push(`/affaires/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Erreur création affaire:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/affaires"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
            Nouvelle affaire
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Onglets */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === "general"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Informations générales
              </button>
              {(formData.type_valorisation === "BPU" || formData.type_valorisation === "mixte") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("bpu")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === "bpu"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  BPU ({bpu.length})
                </button>
              )}
              {(formData.type_valorisation === "dépense" || formData.type_valorisation === "mixte") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("depenses")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === "depenses"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Dépenses ({depenses.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("lots")}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === "lots"
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Lots / Jalons ({lots.length})
              </button>
            </nav>
          </div>

          {/* Onglet Informations générales */}
          {activeTab === "general" && (
            <div className="card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ex: 2025-0001"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Laissé vide, un numéro sera généré automatiquement
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de valorisation <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type_valorisation"
                    value={formData.type_valorisation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="forfait">Forfait</option>
                    <option value="BPU">BPU (Bordereau de Prix Unitaires)</option>
                    <option value="dépense">Dépenses</option>
                    <option value="mixte">Mixte (BPU + Dépenses)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Libellé <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="libelle"
                    value={formData.libelle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site
                  </label>
                  <select
                    name="site_id"
                    value={formData.site_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Sélectionner...</option>
                    {sites.map((site) => (
                      <option key={site.site_id} value={site.site_id}>
                        {site.site_code} - {site.site_label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    name="partenaire_id"
                    value={formData.partenaire_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Sélectionner...</option>
                    {partenaires.map((partenaire) => (
                      <option key={partenaire.id} value={partenaire.id}>
                        {partenaire.raison_sociale}
                        {partenaire.code_interne && ` (${partenaire.code_interne})`}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.partenaire_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact (optionnel)
                    </label>
                    <select
                      name="contact_id"
                      value={formData.contact_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Aucun contact spécifique</option>
                      {availableContacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.prenom} {contact.nom}
                          {contact.fonction && ` - ${contact.fonction}`}
                        </option>
                      ))}
                    </select>
                    {formData.site_id && availableContacts.length === 0 && formData.partenaire_id && (
                      <p className="mt-1 text-xs text-gray-500">
                        Aucun contact disponible pour ce partenaire sur ce site
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chargé d'affaires
                  </label>
                  <select
                    name="charge_affaires_id"
                    value={formData.charge_affaires_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Sélectionner...</option>
                    {collaborateurs.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.prenom} {col.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date début
                  </label>
                  <input
                    type="date"
                    name="date_debut"
                    value={formData.date_debut}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date fin
                  </label>
                  <input
                    type="date"
                    name="date_fin"
                    value={formData.date_fin}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {formData.type_valorisation === "forfait" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant total (€)
                    </label>
                    <input
                      type="number"
                      name="montant_total"
                      value={formData.montant_total}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <select
                    name="priorite"
                    value={formData.priorite}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Onglet BPU */}
          {activeTab === "bpu" && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Lignes BPU</h2>
                <button
                  type="button"
                  onClick={addLigneBPU}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une ligne
                </button>
              </div>

              {bpu.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aucune ligne BPU. Cliquez sur "Ajouter une ligne" pour commencer.
                </p>
              ) : (
                <div className="space-y-4">
                  {bpu.map((ligne) => (
                    <div key={ligne.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">Ligne BPU</h3>
                        <button
                          type="button"
                          onClick={() => removeLigneBPU(ligne.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Code BPU
                          </label>
                          <input
                            type="text"
                            value={ligne.code_bpu || ""}
                            onChange={(e) => updateLigneBPU(ligne.id, "code_bpu", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            placeholder="Ex: TR001"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Libellé <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={ligne.libelle_bpu}
                            onChange={(e) => updateLigneBPU(ligne.id, "libelle_bpu", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unité
                          </label>
                          <input
                            type="text"
                            value={ligne.unite || ""}
                            onChange={(e) => updateLigneBPU(ligne.id, "unite", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            placeholder="h, j, m²..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantité prévue <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={ligne.quantite_prevue}
                            onChange={(e) => updateLigneBPU(ligne.id, "quantite_prevue", parseFloat(e.target.value) || 0)}
                            step="0.001"
                            min="0"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Prix unitaire HT (€) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={ligne.prix_unitaire_ht}
                            onChange={(e) => updateLigneBPU(ligne.id, "prix_unitaire_ht", parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={ligne.description || ""}
                            onChange={(e) => updateLigneBPU(ligne.id, "description", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Total HT
                          </label>
                          <div className="px-2 py-1.5 text-sm bg-gray-50 rounded border border-gray-200">
                            {(ligne.quantite_prevue * ligne.prix_unitaire_ht).toFixed(2)} €
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Onglet Dépenses */}
          {activeTab === "depenses" && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Dépenses</h2>
                <button
                  type="button"
                  onClick={addDepense}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une dépense
                </button>
              </div>

              {depenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aucune dépense. Cliquez sur "Ajouter une dépense" pour commencer.
                </p>
              ) : (
                <div className="space-y-4">
                  {depenses.map((dep) => (
                    <div key={dep.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">Dépense</h3>
                        <button
                          type="button"
                          onClick={() => removeDepense(dep.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Catégorie
                          </label>
                          <select
                            value={dep.categorie || ""}
                            onChange={(e) => updateDepense(dep.id, "categorie", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="Matériel">Matériel</option>
                            <option value="Prestation">Prestation</option>
                            <option value="Transport">Transport</option>
                            <option value="Autre">Autre</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Libellé <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={dep.libelle}
                            onChange={(e) => updateDepense(dep.id, "libelle", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Montant HT (€) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={dep.montant_ht}
                            onChange={(e) => updateDepense(dep.id, "montant_ht", parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Taux TVA (%)
                          </label>
                          <input
                            type="number"
                            value={dep.taux_tva}
                            onChange={(e) => updateDepense(dep.id, "taux_tva", parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Total TTC
                          </label>
                          <div className="px-2 py-1.5 text-sm bg-gray-50 rounded border border-gray-200">
                            {(dep.montant_ht * (1 + dep.taux_tva / 100)).toFixed(2)} €
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Date dépense
                          </label>
                          <input
                            type="date"
                            value={dep.date_depense}
                            onChange={(e) => updateDepense(dep.id, "date_depense", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Date facturation
                          </label>
                          <input
                            type="date"
                            value={dep.date_facturation || ""}
                            onChange={(e) => updateDepense(dep.id, "date_facturation", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            N° facture
                          </label>
                          <input
                            type="text"
                            value={dep.numero_facture || ""}
                            onChange={(e) => updateDepense(dep.id, "numero_facture", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Fournisseur
                          </label>
                          <input
                            type="text"
                            value={dep.fournisseur || ""}
                            onChange={(e) => updateDepense(dep.id, "fournisseur", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={dep.description || ""}
                            onChange={(e) => updateDepense(dep.id, "description", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4">
            <Link href="/affaires" className="btn-secondary">
              Annuler
            </Link>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Création..." : "Créer l'affaire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

