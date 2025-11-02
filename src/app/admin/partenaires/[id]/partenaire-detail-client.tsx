"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Save, Plus, X, FileText, CheckCircle } from "lucide-react";
import type { Partenaire, ContactPartenaire, DocumentPartenaire } from "@/types/partenaires";

interface PartenaireDetailClientProps {
  partenaire: Partenaire;
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
}

export default function PartenaireDetailClient({
  partenaire: initialPartenaire,
  sites,
}: PartenaireDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "contacts" | "sites">("general");
  const [isEditing, setIsEditing] = useState(false);
  const [partenaire, setPartenaire] = useState(initialPartenaire);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactPartenaire[]>(initialPartenaire.contacts || []);
  const [linkedSites, setLinkedSites] = useState<Array<{ site_id: string; site_code: string; site_label: string }>>(
    initialPartenaire.sites || []
  );
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactPartenaire | null>(null);

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
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${styles[type] || styles.client}`}>
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
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${styles[statut] || styles.actif}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  const getStatutDocumentBadge = (statut: string) => {
    const styles: Record<string, string> = {
      valide: "bg-green-100 text-green-800",
      expire: "bg-red-100 text-red-800",
      en_attente: "bg-yellow-100 text-yellow-800",
      a_renouveler: "bg-orange-100 text-orange-800",
    };

    const labels: Record<string, string> = {
      valide: "Valide",
      expire: "Expiré",
      en_attente: "En attente",
      a_renouveler: "À renouveler",
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[statut] || styles.valide}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partenaires/${partenaire.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partenaire),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      const updated = await response.json();
      setPartenaire(updated);
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
    setPartenaire((prev) => ({ ...prev, [name]: value }));
  };

  // Gestion des contacts
  const handleSaveContact = async (contactData: Partial<ContactPartenaire>) => {
    setLoading(true);
    try {
      const url = editingContact
        ? `/api/partenaires/${partenaire.id}/contacts/${editingContact.id}`
        : `/api/partenaires/${partenaire.id}/contacts`;
      const method = editingContact ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      // Rafraîchir la liste
      const contactsResponse = await fetch(`/api/partenaires/${partenaire.id}/contacts`);
      const updatedContacts = await contactsResponse.json();
      setContacts(updatedContacts);
      setShowContactModal(false);
      setEditingContact(null);
      router.refresh();
    } catch (error) {
      console.error("Erreur sauvegarde contact:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContactStatut = async (contactId: string, currentStatut: string) => {
    setLoading(true);
    try {
      const newStatut = currentStatut === "actif" ? "inactif" : "actif";
      const response = await fetch(`/api/partenaires/${partenaire.id}/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification");
      }

      setContacts(contacts.map((c) => c.id === contactId ? { ...c, statut: newStatut } : c));
      router.refresh();
    } catch (error) {
      console.error("Erreur modification statut contact:", error);
      alert("Erreur lors de la modification");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/partenaires/${partenaire.id}/contacts/${contactId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      setContacts(contacts.filter((c) => c.id !== contactId));
      router.refresh();
    } catch (error) {
      console.error("Erreur suppression contact:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  // Gestion des sites liés
  const handleAddSite = async (siteId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/partenaires/${partenaire.id}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout du site");
      }

      const newSite = sites.find((s) => s.site_id === siteId);
      if (newSite) {
        setLinkedSites([...linkedSites, newSite]);
      }
      setShowSiteModal(false);
      router.refresh();
    } catch (error) {
      console.error("Erreur ajout site:", error);
      alert("Erreur lors de l'ajout du site");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSite = async (siteId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce site ?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/partenaires/${partenaire.id}/sites/${siteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      setLinkedSites(linkedSites.filter((s) => s.site_id !== siteId));
      router.refresh();
    } catch (error) {
      console.error("Erreur suppression site:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/partenaires"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                  {partenaire.raison_sociale}
                </h1>
                {getTypeBadge(partenaire.type_partenaire)}
                {getStatutBadge(partenaire.statut)}
              </div>
              {partenaire.code_interne && (
                <p className="text-gray-600">Code: {partenaire.code_interne}</p>
              )}
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
              onClick={() => setActiveTab("contacts")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "contacts"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Contacts ({contacts.filter((c) => c.statut === "actif").length})
            </button>
            <button
              onClick={() => setActiveTab("sites")}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === "sites"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Sites liés ({linkedSites.length})
            </button>
          </nav>
        </div>

        {/* Onglet Informations générales */}
        {activeTab === "general" && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary mb-4">Informations générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de partenaire</label>
                {isEditing ? (
                  <select
                    name="type_partenaire"
                    value={partenaire.type_partenaire}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="client">Client</option>
                    <option value="fournisseur">Fournisseur</option>
                    <option value="mixte">Mixte</option>
                  </select>
                ) : (
                  <div className="px-3 py-2">{getTypeBadge(partenaire.type_partenaire)}</div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="raison_sociale"
                    value={partenaire.raison_sociale}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.raison_sociale}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code interne</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="code_interne"
                    value={partenaire.code_interne || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.code_interne || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="siret"
                    value={partenaire.siret || ""}
                    onChange={handleChange}
                    maxLength={14}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.siret || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIREN</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="siren"
                    value={partenaire.siren || ""}
                    onChange={handleChange}
                    maxLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.siren || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="forme_juridique"
                    value={partenaire.forme_juridique || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.forme_juridique || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="secteur_activite"
                    value={partenaire.secteur_activite || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.secteur_activite || "-"}</div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                {isEditing ? (
                  <textarea
                    name="adresse"
                    value={partenaire.adresse || ""}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">{partenaire.adresse || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="code_postal"
                    value={partenaire.code_postal || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.code_postal || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="ville"
                    value={partenaire.ville || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.ville || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="pays"
                    value={partenaire.pays || "France"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.pays || "France"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="telephone_principal"
                    value={partenaire.telephone_principal || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.telephone_principal || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email_principal"
                    value={partenaire.email_principal || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">{partenaire.email_principal || "-"}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                {isEditing ? (
                  <input
                    type="url"
                    name="site_web"
                    value={partenaire.site_web || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">
                    {partenaire.site_web ? (
                      <a href={partenaire.site_web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {partenaire.site_web}
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capital social (€)</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="capital_social"
                    value={partenaire.capital_social || ""}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded">
                    {partenaire.capital_social ? `${partenaire.capital_social.toFixed(2)} €` : "-"}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                {isEditing ? (
                  <textarea
                    name="observations"
                    value={partenaire.observations || ""}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 rounded min-h-[60px]">
                    {partenaire.observations || "Aucune observation"}
                  </div>
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
        )}

        {/* Onglet Contacts */}
        {activeTab === "contacts" && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary">Contacts</h2>
              <button
                onClick={() => {
                  setEditingContact(null);
                  setShowContactModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un contact
              </button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun contact enregistré</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonction</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Téléphone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Email</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Principal</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        onClick={() => {
                          setEditingContact(contact);
                          setShowContactModal(true);
                        }}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {contact.prenom} {contact.nom}
                          {contact.est_contact_principal && (
                            <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Principal
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{contact.fonction || "-"}</td>
                        <td className="px-4 py-3 text-sm hidden md:table-cell">
                          {contact.telephone_pro || contact.telephone_mobile || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm hidden lg:table-cell">
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contact.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contact.est_contact_principal ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleContactStatut(contact.id, contact.statut);
                          }}
                        >
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                              contact.statut === "actif"
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {contact.statut === "actif" ? "Actif" : "Inactif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Contact */}
            {showContactModal && (
              <ContactModal
                contact={editingContact}
                onSave={handleSaveContact}
                onClose={() => {
                  setShowContactModal(false);
                  setEditingContact(null);
                }}
              />
            )}
          </div>
        )}

        {/* Onglet Sites */}
        {activeTab === "sites" && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-secondary">Sites liés</h2>
              <button
                onClick={() => setShowSiteModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Lier un site
              </button>
            </div>

            {linkedSites.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun site lié à ce partenaire</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {linkedSites.map((site) => (
                      <tr key={site.site_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">
                          <Link
                            href={`/rh/sites#${site.site_id}`}
                            className="text-primary hover:text-primary-dark"
                          >
                            {site.site_code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{site.site_label}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveSite(site.site_id)}
                            className="text-red-600 hover:text-red-800"
                            title="Retirer le site"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal pour lier un site */}
            {showSiteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full">
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Lier un site</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site à lier <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="site-select"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          defaultValue=""
                        >
                          <option value="">Sélectionner un site</option>
                          {sites
                            .filter((s) => !linkedSites.some((ls) => ls.site_id === s.site_id))
                            .map((site) => (
                              <option key={site.site_id} value={site.site_id}>
                                {site.site_code} - {site.site_label}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex justify-end gap-4 pt-4">
                        <button
                          onClick={() => setShowSiteModal(false)}
                          className="btn-secondary"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => {
                            const select = document.getElementById("site-select") as HTMLSelectElement;
                            const siteId = select.value;
                            if (siteId) {
                              handleAddSite(siteId);
                            }
                          }}
                          className="btn-primary"
                          disabled={loading}
                        >
                          {loading ? "Ajout..." : "Ajouter"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Modal pour créer/modifier un contact
function ContactModal({
  contact,
  onSave,
  onClose,
}: {
  contact: ContactPartenaire | null;
  onSave: (data: Partial<ContactPartenaire>) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<ContactPartenaire>>({
    nom: contact?.nom || "",
    prenom: contact?.prenom || "",
    fonction: contact?.fonction || "",
    telephone_pro: contact?.telephone_pro || "",
    telephone_mobile: contact?.telephone_mobile || "",
    email: contact?.email || "",
    disponibilite: contact?.disponibilite || "",
    observations: contact?.observations || "",
    est_contact_principal: contact?.est_contact_principal || false,
    statut: contact?.statut || "actif",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            {contact ? "Modifier le contact" : "Nouveau contact"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                <input
                  type="text"
                  name="fonction"
                  value={formData.fonction || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: Acheteur, Chef de projet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone pro</label>
                <input
                  type="tel"
                  name="telephone_pro"
                  value={formData.telephone_pro || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone mobile</label>
                <input
                  type="tel"
                  name="telephone_mobile"
                  value={formData.telephone_mobile || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilité</label>
                <textarea
                  name="disponibilite"
                  value={formData.disponibilite || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Horaires, disponibilité..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea
                  name="observations"
                  value={formData.observations || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  name="statut"
                  value={formData.statut || "actif"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="est_contact_principal"
                    checked={formData.est_contact_principal || false}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Contact principal</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal pour créer/modifier un document
function DocumentModal({
  document,
  sites,
  onSave,
  onClose,
}: {
  document: DocumentPartenaire | null;
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
  onSave: (data: Partial<DocumentPartenaire>) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<DocumentPartenaire>>({
    type_document: document?.type_document || "autre",
    titre: document?.titre || "",
    description: document?.description || "",
    date_emission: document?.date_emission || "",
    date_expiration: document?.date_expiration || "",
    url_storage: document?.url_storage || "",
    lien_externe: document?.lien_externe || "",
    site_id: document?.site_id || "",
    est_contrat_principal: document?.est_contrat_principal || false,
    est_document_reference: document?.est_document_reference || false,
    est_interne_rh: document?.est_interne_rh || false,
    observations: document?.observations || "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            {document ? "Modifier le document" : "Nouveau document"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de document <span className="text-red-500">*</span>
                </label>
                <select
                  name="type_document"
                  value={formData.type_document || "autre"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="contrat_cadre">Contrat cadre</option>
                  <option value="devis">Devis</option>
                  <option value="bon_commande">Bon de commande</option>
                  <option value="attestation_urssaf">Attestation URSSAF</option>
                  <option value="attestation_assurance">Attestation assurance</option>
                  <option value="attestation_decennale">Attestation décennale</option>
                  <option value="certificat_qualite">Certificat qualité</option>
                  <option value="certificat_iso">Certificat ISO</option>
                  <option value="fiche_securite">Fiche sécurité</option>
                  <option value="plan_prevention">Plan de prévention</option>
                  <option value="correspondance">Correspondance</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site lié (optionnel)
                </label>
                <select
                  name="site_id"
                  value={formData.site_id || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Aucun site</option>
                  {sites.map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.site_code} - {site.site_label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="titre"
                  value={formData.titre || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'émission</label>
                <input
                  type="date"
                  name="date_emission"
                  value={formData.date_emission || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
                <input
                  type="date"
                  name="date_expiration"
                  value={formData.date_expiration || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL du document</label>
                <input
                  type="url"
                  name="url_storage"
                  value={formData.url_storage || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Lien Supabase Storage ou externe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien externe</label>
                <input
                  type="url"
                  name="lien_externe"
                  value={formData.lien_externe || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="SharePoint, Drive, etc."
                />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="est_contrat_principal"
                    checked={formData.est_contrat_principal || false}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Contrat principal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="est_document_reference"
                    checked={formData.est_document_reference || false}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Document de référence</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="est_interne_rh"
                    checked={formData.est_interne_rh || false}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Interne RH (confidentiel)</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea
                  name="observations"
                  value={formData.observations || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

