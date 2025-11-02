"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase/client";
import Modal from "@/components/rh/Modal";
import type { SiteAvecResponsables } from "@/types/sites";

interface SitesManagementClientProps {
  sites: SiteAvecResponsables[];
}

export default function SitesManagementClient({
  sites: initialSites,
}: SitesManagementClientProps) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteAvecResponsables | null>(null);
  const [modalResponsablesOpen, setModalResponsablesOpen] = useState(false);
  const [siteForResponsables, setSiteForResponsables] = useState<SiteAvecResponsables | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async (siteData: { site_code: string; site_label: string; parent_site_id?: string; is_active: boolean }) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();

      if (selectedSite) {
        // Mise à jour
        const { error: updateError } = await supabase
          .from("tbl_sites")
          .update(siteData)
          .eq("site_id", selectedSite.site_id);

        if (updateError) throw updateError;
        setSuccess("Site modifié avec succès");
      } else {
        // Création - On récupère d'abord juste le site (sans responsables car il n'y en a pas encore)
        const { data: insertedSite, error: insertError } = await supabase
          .from("tbl_sites")
          .insert(siteData)
          .select("*")
          .single();

        if (insertError) {
          console.error("❌ Erreur insertion site:", insertError);
          console.error("Code:", insertError.code);
          console.error("Message:", insertError.message);
          console.error("Details:", insertError.details);
          console.error("Hint:", insertError.hint);
          throw insertError;
        }

        console.log("✅ Site créé avec succès:", insertedSite);

        // Formater le nouveau site pour l'ajouter à la liste locale
        const newSite: SiteAvecResponsables = {
          ...insertedSite,
          responsables_actifs: [], // Pas de responsables lors de la création
        };

        setSites([...sites, newSite].sort((a, b) => a.site_code.localeCompare(b.site_code)));
        setSuccess("Site créé avec succès");
      }

      // Fermer le modal après un court délai
      setTimeout(() => {
        setModalOpen(false);
        setSelectedSite(null);
        // Rafraîchir les données du serveur
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("❌ Erreur complète handleSave:", err);
      let errorMessage = "Erreur lors de la sauvegarde";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (siteId: string, newStatus: boolean) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();
      const { error } = await supabase
        .from("tbl_sites")
        .update({ is_active: newStatus })
        .eq("site_id", siteId);

      if (error) throw error;
      
      // Mettre à jour localement
      setSites(sites.map(s => 
        s.site_id === siteId ? { ...s, is_active: newStatus } : s
      ));
      
      setSuccess(`Site ${newStatus ? "activé" : "désactivé"} avec succès`);
      setTimeout(() => {
        setSuccess(null);
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Erreur changement statut:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Message de succès */}
        {success && (
          <div className="mb-4 sm:mb-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm sm:text-base text-green-800 font-medium">{success}</p>
          </div>
        )}

        {/* Message d'erreur */}
        {error && !modalOpen && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm sm:text-base text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
              Gestion des Sites
            </h1>
            <p className="text-base sm:text-lg text-secondary">
              Gérez les sites et leurs responsables d&apos;activité
            </p>
          </div>
          <button
              onClick={() => {
                setSelectedSite(null);
                setModalOpen(true);
              }}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
            <Plus className="h-5 w-5" />
            <span className="whitespace-nowrap">Ajouter un site</span>
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-primary/10 to-primary/5">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Libellé
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider hidden md:table-cell">
                    Site parent
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Responsables
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Aucun site enregistré
                    </td>
                  </tr>
                ) : (
                  sites.map((site) => (
                    <tr key={site.site_id} className="hover:bg-primary/5 transition-colors duration-150">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {site.site_code}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{site.site_label}</div>
                          {site.parent_site_id && (
                            <div className="text-xs text-gray-500 md:hidden mt-1">
                              Parent: {sites.find(s => s.site_id === site.parent_site_id)?.site_label || "-"}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {site.parent_site_id 
                          ? sites.find(s => s.site_id === site.parent_site_id)?.site_label || "-"
                          : "-"}
                      </td>
                      <td 
                        className="px-3 sm:px-6 py-4 text-sm text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setSiteForResponsables(site);
                          setModalResponsablesOpen(true);
                        }}
                        title="Cliquer pour gérer les responsables"
                      >
                        {site.responsables_actifs.length === 0 ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm">Aucun responsable</span>
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {site.responsables_actifs.map((resp, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-xs sm:text-sm truncate">
                                  {resp.collaborateur?.prenom} {resp.collaborateur?.nom}
                                  {resp.role_fonctionnel !== "Responsable d'activité" && (
                                    <span className="text-gray-500 ml-1 hidden sm:inline">
                                      ({resp.role_fonctionnel})
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(site.site_id, !site.is_active);
                          }}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all hover:scale-105 ${
                            site.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                          title={`Cliquer pour ${site.is_active ? "désactiver" : "activer"} le site`}
                        >
                          {site.is_active ? "Actif" : "Inactif"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal création/édition site */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSite(null);
          setError(null);
        }}
        title={selectedSite ? "Modifier le site" : "Nouveau site"}
        size="md"
      >
        <SiteForm
          site={selectedSite}
          allSites={sites}
          onSave={handleSave}
          onCancel={() => {
            setModalOpen(false);
            setSelectedSite(null);
            setError(null);
            setSuccess(null);
          }}
          loading={loading}
          error={error}
          success={success}
        />
      </Modal>

      {/* Modal gestion responsables */}
      {siteForResponsables && (
        <Modal
          isOpen={modalResponsablesOpen}
          onClose={() => {
            setModalResponsablesOpen(false);
            setSiteForResponsables(null);
          }}
          title={`Gérer les responsables - ${siteForResponsables.site_code}`}
          size="lg"
        >
          <ResponsablesManagement
            site={siteForResponsables}
            onSuccess={() => {
              router.refresh();
              setTimeout(() => {
                setModalResponsablesOpen(false);
                setSiteForResponsables(null);
              }, 1000);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// Formulaire site
function SiteForm({
  site,
  allSites,
  onSave,
  onCancel,
  loading,
  error,
  success,
}: {
  site: SiteAvecResponsables | null;
  allSites: SiteAvecResponsables[];
  onSave: (data: { site_code: string; site_label: string; parent_site_id?: string; is_active: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  success: string | null;
}) {
  const [formData, setFormData] = useState({
    site_code: site?.site_code || "",
    site_label: site?.site_label || "",
    parent_site_id: site?.parent_site_id || "",
    is_active: site?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      parent_site_id: formData.parent_site_id || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Code site *
        </label>
        <input
          type="text"
          required
          value={formData.site_code}
          onChange={(e) => setFormData({ ...formData, site_code: e.target.value.toUpperCase() })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
          placeholder="Ex: BEL, DAM, SAV"
          maxLength={10}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Libellé *
        </label>
        <input
          type="text"
          required
          value={formData.site_label}
          onChange={(e) => setFormData({ ...formData, site_label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
          placeholder="Ex: Bellegarde, Damparis, Savoie"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site parent (optionnel)
        </label>
        <select
          value={formData.parent_site_id}
          onChange={(e) => setFormData({ ...formData, parent_site_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900"
        >
          <option value="">Aucun</option>
          {allSites
            .filter((s) => !site || s.site_id !== site.site_id)
            .map((s) => (
              <option key={s.site_id} value={s.site_id}>
                {s.site_code} - {s.site_label}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Site actif</span>
        </label>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sauvegarde..." : site ? "Modifier" : "Créer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// Composant gestion des responsables d'activité
function ResponsablesManagement({
  site,
  onSuccess,
}: {
  site: SiteAvecResponsables;
  onSuccess: () => void;
}) {
  const [collaborateurs, setCollaborateurs] = useState<Array<{ id: string; nom: string; prenom: string }>>([]);
  const [selectedCollaborateurId, setSelectedCollaborateurId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Charger les collaborateurs disponibles
  useEffect(() => {
    const loadCollaborateurs = async () => {
      try {
        const supabase = createClientSupabase();
        const { data, error: fetchError } = await supabase
          .from("collaborateurs")
          .select("id, nom, prenom")
          .eq("statut", "actif")
          .order("nom", { ascending: true });

        if (fetchError) throw fetchError;
        setCollaborateurs(data || []);
      } catch (err) {
        console.error("Erreur chargement collaborateurs:", err);
        setError("Erreur lors du chargement des collaborateurs");
      } finally {
        setLoadingList(false);
      }
    };

    loadCollaborateurs();
  }, []);

  const handleAddResponsable = async () => {
    if (!selectedCollaborateurId) {
      setError("Veuillez sélectionner un collaborateur");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();
      
      // Vérifier si le collaborateur est déjà responsable de ce site
      const { data: existing } = await supabase
        .from("tbl_site_responsables")
        .select("*")
        .eq("site_id", site.site_id)
        .eq("collaborateur_id", selectedCollaborateurId)
        .eq("role_fonctionnel", "Responsable d'activité")
        .maybeSingle();

      if (existing) {
        // Si existe mais inactif, le réactiver
        if (!existing.is_active || (existing.date_fin && new Date(existing.date_fin) < new Date())) {
          const { error: updateError } = await supabase
            .from("tbl_site_responsables")
            .update({
              is_active: true,
              date_fin: null,
              date_debut: new Date().toISOString().split('T')[0],
            })
            .eq("site_id", site.site_id)
            .eq("collaborateur_id", selectedCollaborateurId)
            .eq("role_fonctionnel", "Responsable d'activité");

          if (updateError) throw updateError;
        } else {
          setError("Ce collaborateur est déjà responsable de ce site");
          setLoading(false);
          return;
        }
      } else {
        // Créer nouvelle association
        const { error: insertError } = await supabase
          .from("tbl_site_responsables")
          .insert({
            site_id: site.site_id,
            collaborateur_id: selectedCollaborateurId,
            role_fonctionnel: "Responsable d'activité",
            date_debut: new Date().toISOString().split('T')[0],
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      setSuccess("Responsable ajouté avec succès");
      setSelectedCollaborateurId("");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      console.error("Erreur ajout responsable:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveResponsable = async (collaborateurId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce responsable ?")) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientSupabase();
      
      // Désactiver plutôt que supprimer
      const { error: updateError } = await supabase
        .from("tbl_site_responsables")
        .update({
          is_active: false,
          date_fin: new Date().toISOString().split('T')[0],
        })
        .eq("site_id", site.site_id)
        .eq("collaborateur_id", collaborateurId)
        .eq("role_fonctionnel", "Responsable d'activité");

      if (updateError) throw updateError;

      setSuccess("Responsable retiré avec succès");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      console.error("Erreur suppression responsable:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les collaborateurs déjà responsables
  const disponibles = collaborateurs.filter(
    (collab) => !site.responsables_actifs.some((r) => r.collaborateur_id === collab.id)
  );

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Liste des responsables actuels */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Responsables actuels</h3>
        {site.responsables_actifs.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun responsable assigné</p>
        ) : (
          <div className="space-y-2">
            {site.responsables_actifs.map((resp) => (
              <div
                key={resp.collaborateur_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {resp.collaborateur?.prenom} {resp.collaborateur?.nom}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveResponsable(resp.collaborateur_id)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800 text-xs underline disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ajouter un responsable */}
      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Ajouter un responsable</h3>
        <div className="flex gap-2">
          <select
            value={selectedCollaborateurId}
            onChange={(e) => setSelectedCollaborateurId(e.target.value)}
            disabled={loading || loadingList || disponibles.length === 0}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 disabled:opacity-50"
          >
            <option value="">
              {loadingList ? "Chargement..." : disponibles.length === 0 ? "Aucun collaborateur disponible" : "Sélectionner un collaborateur"}
            </option>
            {disponibles.map((collab) => (
              <option key={collab.id} value={collab.id}>
                {collab.prenom} {collab.nom}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddResponsable}
            disabled={loading || !selectedCollaborateurId || disponibles.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

