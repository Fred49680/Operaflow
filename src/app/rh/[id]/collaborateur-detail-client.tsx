"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Award,
  Radio,
  Stethoscope,
  Calendar,
  ChevronLeft,
  Edit,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  Activity,
  Building2,
  Shield,
  GraduationCap,
  XCircle,
  CalendarX,
} from "lucide-react";
import type {
  Collaborateur,
  Habilitation,
  Dosimetrie,
  VisiteMedicale,
  Absence,
  Formation,
  CatalogueAbsence,
} from "@/types/rh";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Modal from "@/components/rh/Modal";
import HabilitationForm from "@/components/rh/forms/HabilitationForm";
import CompetenceForm from "@/components/rh/forms/CompetenceForm";
import AbsenceForm from "@/components/rh/forms/AbsenceForm";
import DosimetrieForm from "@/components/rh/forms/DosimetrieForm";
import VisiteMedicaleForm from "@/components/rh/forms/VisiteMedicaleForm";

interface CollaborateurDetailClientProps {
  collaborateur: Collaborateur;
  habilitations: Habilitation[];
  dosimetries: Dosimetrie[];
  visitesMedicales: VisiteMedicale[];
  absences: Absence[];
  formations: Formation[];
  competences: Array<{
    id: string;
    collaborateur_id: string;
    competence_id: string;
    niveau?: string | null;
    date_obtention?: string | null;
    date_expiration?: string | null;
    statut: string;
    competence?: {
      id: string;
      libelle: string;
    } | null;
  }>;
  hasRHAccess: boolean;
  sites: Array<{ site_id: string; site_code: string; site_label: string }>;
  responsables: Array<{ id: string; nom: string; prenom: string }>;
  availableUsers: Array<{ id: string; email: string }>;
  fonctions: Array<{ id: string; libelle: string }>;
  catalogue?: CatalogueAbsence[];
  isInModal?: boolean; // Indique si le composant est utilisé dans un modal
}

type Tab = "general" | "competences" | "dosimetrie" | "medical" | "absences";

export default function CollaborateurDetailClient({
  catalogue = [],
  collaborateur,
  habilitations,
  dosimetries,
  visitesMedicales,
  absences,
  formations,
  competences,
  hasRHAccess,
  sites,
  responsables,
  availableUsers,
  fonctions,
  isInModal = false,
}: CollaborateurDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [modalHabilitationOpen, setModalHabilitationOpen] = useState(false);
  const [selectedHabilitation, setSelectedHabilitation] = useState<Habilitation | null>(null);
  const [modalAbsenceOpen, setModalAbsenceOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [modalDosimetrieOpen, setModalDosimetrieOpen] = useState(false);
  const [selectedDosimetrie, setSelectedDosimetrie] = useState<Dosimetrie | null>(null);
  const [modalVisiteOpen, setModalVisiteOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<VisiteMedicale | null>(null);
  const [modalCompetenceOpen, setModalCompetenceOpen] = useState(false);
  const [selectedCompetence, setSelectedCompetence] = useState<{
    id: string;
    competence_id: string;
    niveau?: string | null;
    date_obtention?: string | null;
    date_expiration?: string | null;
    statut: string;
  } | null>(null);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshData = () => {
    if (isInModal) {
      // Dans un modal, on recharge les données via l'API
      // La fonction refreshCollaborateurDetail est appelée depuis le modal
      import("@/components/rh/CollaborateurDetailModal").then((module) => {
        module.refreshCollaborateurDetail();
      });
    } else {
      router.refresh();
    }
  };

  const tabs = [
    { id: "general" as Tab, label: "Informations générales", icon: User },
    { id: "competences" as Tab, label: "Compétences & Habilitations", icon: Award },
    { id: "dosimetrie" as Tab, label: "Dosimétrie & RTR", icon: Radio },
    { id: "medical" as Tab, label: "Visites médicales", icon: Stethoscope },
    { id: "absences" as Tab, label: "Absences", icon: Calendar },
  ];

  return (
    <div className={isInModal ? "" : "min-h-screen bg-background p-8"}>
      <div className={isInModal ? "" : "max-w-7xl mx-auto"}>
        {/* En-tête - seulement si pas dans un modal */}
        {!isInModal && (
          <div className="mb-6">
            <Link
              href="/rh"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-4"
            >
              <ChevronLeft className="h-5 w-5" />
              Retour à la liste
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                  {collaborateur.prenom} {collaborateur.nom}
                </h1>
              </div>
              {hasRHAccess && (
                <button
                  onClick={() => setModalEditOpen(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Edit className="h-5 w-5" />
                  Modifier
                </button>
              )}
            </div>
          </div>
        )}

        {/* En-tête compact pour modal */}
        {isInModal && (
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">
                  {collaborateur.prenom} {collaborateur.nom}
                </h1>
              </div>
              {hasRHAccess && (
                <button
                  onClick={() => setModalEditOpen(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Edit className="h-5 w-5" />
                  Modifier
                </button>
              )}
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className={isInModal ? "bg-white rounded-lg p-6 shadow-sm" : "card"}>
          {activeTab === "general" && (
            <OngletGeneral collaborateur={collaborateur} />
          )}
          {activeTab === "competences" && (
            <OngletCompetences
              habilitations={habilitations}
              competences={competences}
              hasRHAccess={hasRHAccess}
              collaborateurId={collaborateur.id}
              onAddHabilitation={() => {
                setSelectedHabilitation(null);
                setModalHabilitationOpen(true);
              }}
              onEditHabilitation={(hab) => {
                setSelectedHabilitation(hab);
                setModalHabilitationOpen(true);
              }}
              onAddCompetence={() => {
                setSelectedCompetence(null);
                setModalCompetenceOpen(true);
              }}
              onEditCompetence={(comp) => {
                setSelectedCompetence(comp);
                setModalCompetenceOpen(true);
              }}
            />
          )}
          {activeTab === "dosimetrie" && (
            <OngletDosimetrie
              dosimetries={dosimetries}
              hasRHAccess={hasRHAccess}
              onAddDosimetrie={() => {
                setSelectedDosimetrie(null);
                setModalDosimetrieOpen(true);
              }}
              onEditDosimetrie={(dos) => {
                setSelectedDosimetrie(dos);
                setModalDosimetrieOpen(true);
              }}
            />
          )}
          {activeTab === "medical" && (
            <OngletMedical
              visitesMedicales={visitesMedicales}
              hasRHAccess={hasRHAccess}
              onAddVisite={() => {
                setSelectedVisite(null);
                setModalVisiteOpen(true);
              }}
              onEditVisite={(vm) => {
                setSelectedVisite(vm);
                setModalVisiteOpen(true);
              }}
            />
          )}
          {activeTab === "absences" && (
            <OngletAbsences
              absences={absences}
              formations={formations}
              canValidate={hasRHAccess || false}
              hasRHAccess={hasRHAccess}
              onAddAbsence={() => {
                setSelectedAbsence(null);
                setModalAbsenceOpen(true);
              }}
              onEditAbsence={(abs) => {
                setSelectedAbsence(abs);
                setModalAbsenceOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Modal Habilitation */}
      <Modal
        isOpen={modalHabilitationOpen}
        onClose={() => {
          setModalHabilitationOpen(false);
          setSelectedHabilitation(null);
        }}
        title={selectedHabilitation ? "Modifier l'habilitation" : "Nouvelle habilitation"}
        size="lg"
      >
        <HabilitationForm
          collaborateurId={collaborateur.id}
          habilitation={selectedHabilitation}
          onClose={() => {
            setModalHabilitationOpen(false);
            setSelectedHabilitation(null);
          }}
          onSuccess={refreshData}
        />
      </Modal>

      {/* Modal Compétence */}
      <Modal
        isOpen={modalCompetenceOpen}
        onClose={() => {
          setModalCompetenceOpen(false);
          setSelectedCompetence(null);
        }}
        title={selectedCompetence ? "Modifier la compétence" : "Nouvelle compétence"}
        size="lg"
      >
        <CompetenceForm
          collaborateurId={collaborateur.id}
          competence={selectedCompetence}
          onClose={() => {
            setModalCompetenceOpen(false);
            setSelectedCompetence(null);
          }}
          onSuccess={refreshData}
        />
      </Modal>

      {/* Modal Absence */}
      <Modal
        isOpen={modalAbsenceOpen}
        onClose={() => {
          setModalAbsenceOpen(false);
          setSelectedAbsence(null);
        }}
        title={selectedAbsence ? "Modifier l'absence" : "Nouvelle absence"}
        size="lg"
      >
        <AbsenceForm
          collaborateurId={collaborateur.id}
          catalogue={catalogue}
          absence={selectedAbsence}
          canEditStatut={hasRHAccess}
          onClose={() => {
            setModalAbsenceOpen(false);
            setSelectedAbsence(null);
          }}
          onSuccess={refreshData}
        />
      </Modal>

      {/* Modal Dosimétrie */}
      <Modal
        isOpen={modalDosimetrieOpen}
        onClose={() => {
          setModalDosimetrieOpen(false);
          setSelectedDosimetrie(null);
        }}
        title={selectedDosimetrie ? "Modifier le relevé dosimétrique" : "Nouveau relevé dosimétrique"}
        size="lg"
      >
        <DosimetrieForm
          collaborateurId={collaborateur.id}
          dosimetrie={selectedDosimetrie}
          onClose={() => {
            setModalDosimetrieOpen(false);
            setSelectedDosimetrie(null);
          }}
          onSuccess={() => {
            refreshData();
          }}
        />
      </Modal>

      {/* Modal Visite médicale */}
      <Modal
        isOpen={modalVisiteOpen}
        onClose={() => {
          setModalVisiteOpen(false);
          setSelectedVisite(null);
        }}
        title={selectedVisite ? "Modifier la visite médicale" : "Nouvelle visite médicale"}
        size="lg"
      >
        <VisiteMedicaleForm
          collaborateurId={collaborateur.id}
          visite={selectedVisite}
          onClose={() => {
            setModalVisiteOpen(false);
            setSelectedVisite(null);
          }}
          onSuccess={() => {
            refreshData();
          }}
        />
      </Modal>

      {/* Modal Édition Collaborateur */}
      <Modal
        isOpen={modalEditOpen}
        onClose={() => {
          setModalEditOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Modifier le collaborateur"
        size="xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            setLoading(true);

            try {
              const formData = new FormData(e.currentTarget);
              const updateData: Record<string, unknown> = {};

              // Récupérer toutes les valeurs du formulaire
              const nom = formData.get("nom") as string;
              const prenom = formData.get("prenom") as string;
              const email = formData.get("email") as string;
              const telephone = formData.get("telephone") as string;
              const fonction_metier = formData.get("fonction_metier") as string;
              const site_id = formData.get("site_id") as string;
              const type_contrat = formData.get("type_contrat") as string;
              const responsable_activite_id = formData.get("responsable_activite_id") as string;
              const user_id = formData.get("user_id") as string;
              const date_embauche = formData.get("date_embauche") as string;
              const date_fin_contrat = formData.get("date_fin_contrat") as string;
              const statut = formData.get("statut") as string;
              const commentaire = formData.get("commentaire") as string;

              // Validation
              if (!nom || !prenom || !email) {
                throw new Error("Nom, prénom et email sont obligatoires");
              }

              // Préparer les données
              updateData.nom = nom.trim();
              updateData.prenom = prenom.trim();
              updateData.email = email.trim();
              updateData.telephone = telephone.trim() || null;
              updateData.fonction_metier = fonction_metier.trim() || null;
              updateData.site_id = site_id || null;
              updateData.type_contrat = type_contrat || "CDI";
              updateData.responsable_activite_id = responsable_activite_id || null;
              updateData.user_id = user_id || null;
              updateData.date_embauche = date_embauche || null;
              updateData.date_fin_contrat = date_fin_contrat || null;
              updateData.statut = statut || "actif";
              updateData.commentaire = commentaire.trim() || null;

              // Nettoyer les valeurs vides
              Object.keys(updateData).forEach((key) => {
                if (updateData[key] === "") {
                  updateData[key] = null;
                }
              });

              // Log de debug en développement
              if (process.env.NODE_ENV === "development") {
                console.log("🔍 DEBUG - Données à envoyer:", updateData);
                console.log("🔍 DEBUG - ID collaborateur:", collaborateur.id);
              }

              // Envoyer la requête PATCH
              const response = await fetch(`/api/rh/collaborateurs/${collaborateur.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
              });

              const responseData = await response.json();

              if (!response.ok) {
                console.error("❌ Erreur API:", responseData);
                throw new Error(
                  responseData.error || 
                  responseData.details || 
                  `Erreur ${response.status}: ${response.statusText}`
                );
              }

              // Log de succès en développement
              if (process.env.NODE_ENV === "development") {
                console.log("✅ Succès - Collaborateur mis à jour:", responseData);
              }

              setSuccess("Collaborateur mis à jour avec succès");
              setTimeout(() => {
                setModalEditOpen(false);
                setError(null);
                setSuccess(null);
                refreshData();
              }, 1500);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-6"
        >
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded-r-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Section Informations personnelles */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informations personnelles
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="nom"
                  defaultValue={collaborateur.nom}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                  placeholder="Nom de famille"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="prenom"
                  defaultValue={collaborateur.prenom}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                  placeholder="Prénom"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  defaultValue={collaborateur.email}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                  placeholder="email@exemple.com"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="telephone"
                  defaultValue={collaborateur.telephone || ""}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                  placeholder="06 12 34 56 78"
                />
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            </div>
          </div>

          {/* Section Informations professionnelles */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Informations professionnelles
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fonction métier
              </label>
              <div className="relative">
                <select
                  name="fonction_metier"
                  defaultValue={collaborateur.fonction_metier || ""}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                >
                  <option value="">Sélectionner une fonction</option>
                  {fonctions.map((fonction) => (
                    <option key={fonction.id} value={fonction.libelle}>
                      {fonction.libelle}
                    </option>
                  ))}
                </select>
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site principal
              </label>
              <div className="relative">
                <select
                  name="site_id"
                  defaultValue={collaborateur.site_id || ""}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all appearance-none"
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map((site) => (
                    <option key={site.site_id} value={site.site_id}>
                      {site.site_code} - {site.site_label}
                    </option>
                  ))}
                </select>
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de contrat
              </label>
              <select
                name="type_contrat"
                defaultValue={collaborateur.type_contrat || "CDI"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Interim">Intérim</option>
                <option value="Apprenti">Apprenti</option>
                <option value="Stagiaire">Stagiaire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsable d'activité
              </label>
              <select
                name="responsable_activite_id"
                defaultValue={collaborateur.responsable_activite_id || ""}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
              >
                <option value="">Auto (selon le site)</option>
                {responsables.map((resp) => (
                  <option key={resp.id} value={resp.id}>
                    {resp.prenom} {resp.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compte utilisateur associé
              </label>
              <select
                name="user_id"
                defaultValue={collaborateur.user_id || ""}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
              >
                <option value="">Aucun</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                name="statut"
                defaultValue={collaborateur.statut || "actif"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
              >
                <option value="actif">Actif</option>
                <option value="A renouveller">A renouveller</option>
                <option value="inactif">Inactif</option>
                <option value="suspendu">Suspendu</option>
                <option value="archivé">Archivé</option>
              </select>
            </div>
            </div>
          </div>

          {/* Section Dates */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Dates importantes
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'embauche
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="date_embauche"
                  defaultValue={
                    collaborateur.date_embauche
                      ? new Date(collaborateur.date_embauche).toISOString().split("T")[0]
                      : ""
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                />
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin de contrat
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="date_fin_contrat"
                  defaultValue={
                    collaborateur.date_fin_contrat
                      ? new Date(collaborateur.date_fin_contrat).toISOString().split("T")[0]
                      : ""
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all"
                />
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            </div>
          </div>

          {/* Section Commentaire */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Notes et commentaires
              </h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire
              </label>
              <textarea
                name="commentaire"
                defaultValue={collaborateur.commentaire || ""}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 transition-all resize-none"
                placeholder="Notes supplémentaires sur ce collaborateur..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setModalEditOpen(false);
                setError(null);
                setSuccess(null);
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Onglet Informations générales
function OngletGeneral({ collaborateur }: { collaborateur: Collaborateur }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Identité */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Identité</h3>
          </div>
          <dl className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 bg-gray-100 rounded-md">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Nom
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  {collaborateur.nom}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 bg-gray-100 rounded-md">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Prénom
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  {collaborateur.prenom}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Email
                </dt>
                <dd className="text-sm font-medium text-gray-900 break-all">
                  {collaborateur.email}
                </dd>
              </div>
            </div>
            {collaborateur.telephone && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-green-50 rounded-md">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Téléphone
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {collaborateur.telephone}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* Section Contrat */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Contrat</h3>
          </div>
          <dl className="space-y-4">
            {collaborateur.type_contrat && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-purple-50 rounded-md">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Type de contrat
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium text-xs">
                      {collaborateur.type_contrat}
                    </span>
                  </dd>
                </div>
              </div>
            )}
            {collaborateur.date_embauche && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Date d'embauche
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {format(new Date(collaborateur.date_embauche), "PPP", {
                      locale: fr,
                    })}
                  </dd>
                </div>
              </div>
            )}
            {collaborateur.date_fin_contrat && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-amber-50 rounded-md">
                  <CalendarIcon className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Date de fin de contrat
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {format(new Date(collaborateur.date_fin_contrat), "PPP", {
                      locale: fr,
                    })}
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 bg-green-50 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Statut
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                      collaborateur.statut === "actif"
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                        : collaborateur.statut === "A renouveller"
                        ? "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-200"
                        : collaborateur.statut === "inactif"
                        ? "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200"
                        : collaborateur.statut === "suspendu"
                        ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                        : "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
                    }`}
                  >
                    {collaborateur.statut}
                  </span>
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Section Affectation */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MapPin className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Affectation</h3>
          </div>
          <dl className="space-y-4">
            {collaborateur.site && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-md">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Site
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium text-xs">
                      {collaborateur.site}
                    </span>
                  </dd>
                </div>
              </div>
            )}
            {collaborateur.fonction_metier && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Fonction métier
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {collaborateur.fonction_metier}
                  </dd>
                </div>
              </div>
            )}
            {collaborateur.responsable && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-cyan-50 rounded-md">
                  <User className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Responsable
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {collaborateur.responsable.prenom}{" "}
                    {collaborateur.responsable.nom}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* Section Commentaire */}
        {collaborateur.commentaire && (
          <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-xl p-6 shadow-sm border border-amber-100">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-amber-200">
              <div className="p-2 bg-amber-50 rounded-lg">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Commentaire
              </h3>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {collaborateur.commentaire}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Onglet Compétences & Habilitations
function OngletCompetences({
  habilitations,
  competences,
  hasRHAccess,
  collaborateurId,
  onAddHabilitation,
  onEditHabilitation,
  onAddCompetence,
  onEditCompetence,
}: {
  habilitations: Habilitation[];
  competences: Array<{
    id: string;
    collaborateur_id: string;
    competence_id: string;
    niveau?: string | null;
    date_obtention?: string | null;
    date_expiration?: string | null;
    statut: string;
    competence?: {
      id: string;
      libelle: string;
    } | null;
  }>;
  hasRHAccess: boolean;
  collaborateurId: string;
  onAddHabilitation: () => void;
  onEditHabilitation: (hab: Habilitation) => void;
  onAddCompetence: () => void;
  onEditCompetence: (comp: {
    id: string;
    competence_id: string;
    niveau?: string | null;
    date_obtention?: string | null;
    date_expiration?: string | null;
    statut: string;
  }) => void;
}) {
  const handleDeleteHabilitation = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette habilitation ?")) return;
    
    try {
      const { createClientSupabase } = await import("@/lib/supabase/client");
      const supabase = createClientSupabase();
      const { error } = await supabase.from("habilitations").delete().eq("id", id);
      
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleDeleteCompetence = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette compétence ?")) return;
    
    try {
      const response = await fetch(`/api/rh/collaborateurs-competences/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }

      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Habilitations</h3>
        {hasRHAccess && (
          <button onClick={onAddHabilitation} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une habilitation
          </button>
        )}
      </div>

      {habilitations.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Aucune habilitation enregistrée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {habilitations.map((hab) => (
            <div
              key={hab.id}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{hab.libelle}</h4>
                    <p className="text-xs text-gray-500 mt-1">{hab.type}</p>
                  </div>
                </div>
                {hasRHAccess && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditHabilitation(hab)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteHabilitation(hab.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <dl className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                    <CalendarIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Date d'obtention
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {format(new Date(hab.date_obtention), "PPP", { locale: fr })}
                    </dd>
                  </div>
                </div>
                {hab.date_expiration && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-amber-50 rounded-md">
                      <CalendarX className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Date d'expiration
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {format(new Date(hab.date_expiration), "PPP", { locale: fr })}
                      </dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-green-50 rounded-md">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Statut
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                          hab.statut === "valide"
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                            : hab.statut === "expire"
                            ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
                            : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {hab.statut}
                      </span>
                    </dd>
                  </div>
                </div>
                {hab.organisme && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-md">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Organisme
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{hab.organisme}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Compétences</h3>
          {hasRHAccess && (
            <button onClick={onAddCompetence} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une compétence
            </button>
          )}
        </div>

        {competences.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucune compétence enregistrée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {competences.map((comp) => (
              <div
                key={comp.id}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{comp.competence?.libelle || "Compétence"}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                        comp.statut === "valide"
                          ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                          : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {comp.statut}
                    </span>
                    {hasRHAccess && (
                      <>
                        <button
                          onClick={() => onEditCompetence(comp)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompetence(comp.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <dl className="space-y-3">
                  {comp.niveau && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-purple-50 rounded-md">
                        <Activity className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Niveau
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{comp.niveau}</dd>
                      </div>
                    </div>
                  )}
                  {comp.date_obtention && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Date d'obtention
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {format(new Date(comp.date_obtention), "PPP", { locale: fr })}
                        </dd>
                      </div>
                    </div>
                  )}
                  {comp.date_expiration && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-amber-50 rounded-md">
                        <CalendarX className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Date d'expiration
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {format(new Date(comp.date_expiration), "PPP", { locale: fr })}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Onglet Dosimétrie
function OngletDosimetrie({
  dosimetries,
  hasRHAccess,
  onAddDosimetrie,
  onEditDosimetrie,
}: {
  dosimetries: Dosimetrie[];
  hasRHAccess: boolean;
  onAddDosimetrie: () => void;
  onEditDosimetrie: (dos: Dosimetrie) => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce relevé dosimétrique ?")) return;
    
    try {
      const { createClientSupabase } = await import("@/lib/supabase/client");
      const supabase = createClientSupabase();
      const { error } = await supabase.from("dosimetrie").delete().eq("id", id);
      
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Suivi dosimétrique</h3>
        {hasRHAccess && (
          <button onClick={onAddDosimetrie} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un relevé
          </button>
        )}
      </div>

      {dosimetries.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <Radio className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Aucun relevé dosimétrique</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dosimetries.map((dos) => (
            <div
              key={dos.id}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Radio className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Dosimètre {dos.numero_dosimetre}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(dos.periode_debut), "dd/MM/yyyy")} - {format(new Date(dos.periode_fin), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
                {hasRHAccess && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditDosimetrie(dos)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dos.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <dl className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Dose trimestrielle
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {dos.dose_trimestrielle_mSv.toFixed(3)} mSv
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-green-50 rounded-md">
                    <Activity className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Dose annuelle
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {dos.dose_annuelle_mSv.toFixed(3)} mSv
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-amber-50 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Limite réglementaire
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {dos.limite_reglementaire_mSv} mSv
                    </dd>
                  </div>
                </div>
                {dos.fournisseur && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-md">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Fournisseur
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{dos.fournisseur}</dd>
                    </div>
                  </div>
                )}
                {dos.laboratoire && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-purple-50 rounded-md">
                      <Building2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Laboratoire
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{dos.laboratoire}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Onglet Visites médicales
function OngletMedical({
  visitesMedicales,
  hasRHAccess,
  onAddVisite,
  onEditVisite,
}: {
  visitesMedicales: VisiteMedicale[];
  hasRHAccess: boolean;
  onAddVisite: () => void;
  onEditVisite: (vm: VisiteMedicale) => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette visite médicale ?")) return;
    
    try {
      const { createClientSupabase } = await import("@/lib/supabase/client");
      const supabase = createClientSupabase();
      const { error } = await supabase.from("visites_medicales").delete().eq("id", id);
      
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const typeLabels: Record<string, string> = {
    embauche: "Visite d'embauche",
    periodique: "Visite périodique",
    reprise: "Visite de reprise",
    inaptitude: "Visite d'inaptitude",
    autre: "Autre visite",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Visites médicales</h3>
        {hasRHAccess && (
          <button onClick={onAddVisite} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une visite
          </button>
        )}
      </div>

      {visitesMedicales.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Aucune visite médicale enregistrée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visitesMedicales.map((vm) => (
            <div
              key={vm.id}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{typeLabels[vm.type_visite] || vm.type_visite}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(vm.date_visite), "PPP", { locale: fr })}
                    </p>
                  </div>
                </div>
                {hasRHAccess && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditVisite(vm)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vm.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <dl className="space-y-3">
                {vm.date_prochaine_visite && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Prochaine visite
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {format(new Date(vm.date_prochaine_visite), "PPP", { locale: fr })}
                      </dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-purple-50 rounded-md">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Statut
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                          vm.statut === "apte"
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                            : vm.statut === "inapte"
                            ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
                            : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {vm.statut}
                      </span>
                    </dd>
                  </div>
                </div>
                {vm.centre_medical && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-md">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Centre médical
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{vm.centre_medical}</dd>
                    </div>
                  </div>
                )}
                {vm.medecin && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-cyan-50 rounded-md">
                      <User className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Médecin
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{vm.medecin}</dd>
                    </div>
                  </div>
                )}
                {vm.avis_medical && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Avis médical
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">{vm.avis_medical}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Onglet Absences
function OngletAbsences({
  absences,
  formations,
  canValidate,
  hasRHAccess,
  onAddAbsence,
  onEditAbsence,
}: {
  absences: Absence[];
  formations: Formation[];
  canValidate: boolean;
  hasRHAccess: boolean;
  onAddAbsence: () => void;
  onEditAbsence: (abs: Absence) => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette absence ?")) return;
    
    try {
      const { createClientSupabase } = await import("@/lib/supabase/client");
      const supabase = createClientSupabase();
      const { error } = await supabase.from("absences").delete().eq("id", id);
      
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleValidate = async (
    id: string, 
    statut: "validee_n1" | "refusee_n1" | "validee_rh" | "refusee_rh",
    niveau: "n1" | "rh" = "n1"
  ) => {
    try {
      const { createClientSupabase } = await import("@/lib/supabase/client");
      const supabase = createClientSupabase();
      
      const updateData: Record<string, unknown> = {
        statut,
      };
      
      // Mettre à jour les champs selon le niveau de validation
      if (niveau === "n1") {
        updateData.valide_par_n1 = (await supabase.auth.getUser()).data.user?.id;
        updateData.date_validation_n1 = new Date().toISOString();
        if (statut === "refusee_n1") {
          updateData.motif_refus_n1 = prompt("Motif du refus (optionnel):") || null;
        }
      } else {
        updateData.valide_par_rh = (await supabase.auth.getUser()).data.user?.id;
        updateData.date_validation_rh = new Date().toISOString();
        if (statut === "refusee_rh") {
          updateData.motif_refus_rh = prompt("Motif du refus (optionnel):") || null;
        }
      }
      
      const { error } = await supabase
        .from("absences")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la validation");
    }
  };

  const typeLabels: Record<string, string> = {
    conges_payes: "Congés payés",
    rtt: "RTT",
    repos_site: "Repos site",
    maladie: "Maladie",
    accident_travail: "Accident du travail",
    absence_autorisee: "Absence autorisée",
    formation: "Formation",
    habilitation: "Habilitation",
    deplacement_externe: "Déplacement externe",
    autre: "Autre",
  };

  return (
    <div className="space-y-8">
      {/* Section Absences */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Absences</h3>
          {(hasRHAccess || canValidate) && (
            <button onClick={onAddAbsence} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle absence
            </button>
          )}
        </div>

        {absences.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucune absence enregistrée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {absences.map((abs) => (
              <div
                key={abs.id}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{typeLabels[abs.type] || abs.type}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(abs.date_debut), "dd/MM/yyyy")} - {format(new Date(abs.date_fin), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  {(hasRHAccess || canValidate) && (
                    <div className="flex items-center gap-2">
                      {/* Actions N+1 : Validation des absences en attente de validation N+1 */}
                      {(abs.statut === "en_attente_validation_n1") && canValidate && (
                        <>
                          <button
                            onClick={() => handleValidate(abs.id, "validee_n1", "n1")}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Valider (N+1)"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleValidate(abs.id, "refusee_n1", "n1")}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Refuser (N+1)"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {/* Actions RH : Validation des absences en attente de validation RH */}
                      {(abs.statut === "en_attente_validation_rh") && hasRHAccess && (
                        <>
                          <button
                            onClick={() => handleValidate(abs.id, "validee_rh", "rh")}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Valider (RH)"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleValidate(abs.id, "refusee_rh", "rh")}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Refuser (RH)"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {hasRHAccess && (
                        <>
                          <button
                            onClick={() => onEditAbsence(abs)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(abs.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <dl className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Durée
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {abs.duree_jours ? `${abs.duree_jours.toFixed(1)} jour${abs.duree_jours > 1 ? "s" : ""}` : "-"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-purple-50 rounded-md">
                      <CheckCircle className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Statut
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                            abs.statut === "validee_rh" || abs.statut === "appliquee"
                              ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                              : abs.statut === "validee_n1"
                              ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200"
                              : abs.statut === "refusee_n1" || abs.statut === "refusee_rh"
                              ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
                              : abs.statut === "annulee"
                              ? "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200"
                              : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {abs.statut === "validee_rh" || abs.statut === "appliquee"
                            ? "Validée RH"
                            : abs.statut === "validee_n1"
                            ? "Validée N+1"
                            : abs.statut === "en_attente_validation_rh"
                            ? "En attente RH"
                            : abs.statut === "en_attente_validation_n1"
                            ? "En attente N+1"
                            : abs.statut === "refusee_n1"
                            ? "Refusée N+1"
                            : abs.statut === "refusee_rh"
                            ? "Refusée RH"
                            : abs.statut === "annulee"
                            ? "Annulée"
                            : "En attente"}
                        </span>
                      </dd>
                    </div>
                  </div>
                  {abs.valide_par_user && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-cyan-50 rounded-md">
                        <User className="h-4 w-4 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Validé par
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{abs.valide_par_user.email}</dd>
                      </div>
                    </div>
                  )}
                  {abs.motif && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Motif
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{abs.motif}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Formations */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Formations</h3>
        </div>
        {formations.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucune formation enregistrée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formations.map((form) => (
              <div
                key={form.id}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <GraduationCap className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{form.libelle}</h4>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                      form.statut === "terminee"
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                        : form.statut === "en_cours"
                        ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200"
                        : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200"
                    }`}
                  >
                    {form.statut === "terminee" ? "Terminée" : form.statut === "en_cours" ? "En cours" : form.statut}
                  </span>
                </div>
                <dl className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-blue-50 rounded-md">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Dates
                      </dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {format(new Date(form.date_debut), "PPP", { locale: fr })}
                        {form.date_fin && ` - ${format(new Date(form.date_fin), "PPP", { locale: fr })}`}
                      </dd>
                    </div>
                  </div>
                  {form.duree_heures && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-purple-50 rounded-md">
                        <Clock className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Durée
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{form.duree_heures} heures</dd>
                      </div>
                    </div>
                  )}
                  {form.organisme_formateur && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-md">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Organisme
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">{form.organisme_formateur}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

