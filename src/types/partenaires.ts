// Types pour le Module Gestion Fournisseurs & Clients (Partenaires)

export type TypePartenaire = 'client' | 'fournisseur' | 'mixte';
export type StatutPartenaire = 'actif' | 'inactif' | 'suspendu' | 'archive';
export type StatutContact = 'actif' | 'inactif';
export type TypeDocument = 
  | 'contrat_cadre'
  | 'devis'
  | 'bon_commande'
  | 'attestation_urssaf'
  | 'attestation_assurance'
  | 'attestation_decennale'
  | 'certificat_qualite'
  | 'certificat_iso'
  | 'fiche_securite'
  | 'plan_prevention'
  | 'correspondance'
  | 'autre';

export type StatutDocument = 'valide' | 'expire' | 'en_attente' | 'a_renouveler';

export interface Partenaire {
  id: string;
  type_partenaire: TypePartenaire;
  raison_sociale: string;
  siret?: string | null;
  siren?: string | null;
  code_interne?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone_principal?: string | null;
  email_principal?: string | null;
  site_web?: string | null;
  secteur_activite?: string | null;
  forme_juridique?: string | null;
  capital_social?: number | null;
  statut: StatutPartenaire;
  observations?: string | null;
  notes_internes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Relations
  contacts?: ContactPartenaire[];
  documents?: DocumentPartenaire[];
  sites?: Array<{ site_id: string; site_code: string; site_label: string }>;
}

export interface ContactPartenaire {
  id: string;
  partenaire_id: string;
  nom: string;
  prenom: string;
  fonction?: string | null;
  telephone_pro?: string | null;
  telephone_mobile?: string | null;
  email?: string | null;
  disponibilite?: string | null;
  observations?: string | null;
  est_contact_principal: boolean;
  statut: StatutContact;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface DocumentPartenaire {
  id: string;
  partenaire_id: string;
  type_document: TypeDocument;
  titre: string;
  description?: string | null;
  date_emission?: string | null;
  date_expiration?: string | null;
  statut: StatutDocument;
  url_storage?: string | null;
  lien_externe?: string | null;
  taille_octets?: number | null;
  nom_fichier_original?: string | null;
  site_id?: string | null;
  est_contrat_principal: boolean;
  est_document_reference: boolean;
  est_interne_rh: boolean;
  observations?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  site?: { site_id: string; site_code: string; site_label: string } | null;
}

export interface PartenaireSite {
  id: string;
  partenaire_id: string;
  site_id: string;
  created_at: string;
  created_by?: string | null;
}

export interface AlerteDocument {
  id: string;
  partenaire_id: string;
  raison_sociale: string;
  type_partenaire: TypePartenaire;
  titre: string;
  type_document: TypeDocument;
  date_expiration: string;
  statut: StatutDocument;
  site_id?: string | null;
  site_label?: string | null;
  site_code?: string | null;
  niveau_alerte: 'expire' | 'expire_j7' | 'expire_j30' | 'valide';
  jours_restants: number;
}

