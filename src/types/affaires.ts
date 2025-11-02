// Types pour le Module 3 : Affaires

export type StatutAffaire = 
  | 'cree'
  | 'pre_planifie'
  | 'planifie'
  | 'en_cours'
  | 'suspendu'
  | 'en_cloture'
  | 'termine'
  | 'archive';

export type TypeValorisation = 'BPU' | 'forfait' | 'dépense' | 'mixte';
export type PrioriteAffaire = 'basse' | 'moyenne' | 'haute' | 'critique';

export interface Affaire {
  id: string;
  numero: string;
  libelle: string;
  description?: string | null;
  client?: string | null; // Deprecated: conservé pour compatibilité
  partenaire_id?: string | null;
  contact_id?: string | null;
  charge_affaires_id?: string | null;
  site_id?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  date_cloture?: string | null;
  montant_total?: number | null;
  type_valorisation?: TypeValorisation | null;
  statut: StatutAffaire;
  priorite?: PrioriteAffaire | null;
  date_pre_planif?: string | null;
  pre_planifie_par?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Relations
  charge_affaires?: { id: string; nom: string; prenom: string } | null;
  site?: { site_id: string; site_code: string; site_label: string } | null;
  partenaire?: { id: string; raison_sociale: string; type_partenaire: string } | null;
  contact?: { id: string; nom: string; prenom: string; email?: string | null } | null;
  bpu?: LigneBPU[];
  depenses?: Depense[];
  lots?: LotAffaire[];
  pre_planif?: PrePlanif | null;
  documents?: DocumentAffaire[];
}

export interface LigneBPU {
  id: string;
  affaire_id: string;
  code_bpu?: string | null;
  libelle_bpu: string;
  description?: string | null;
  unite?: string | null;
  quantite_prevue: number;
  quantite_reelle?: number | null;
  prix_unitaire_ht: number;
  montant_total_ht: number;
  ordre_affichage?: number | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface Depense {
  id: string;
  affaire_id: string;
  categorie?: string | null;
  libelle: string;
  description?: string | null;
  montant_ht: number;
  taux_tva: number;
  montant_ttc: number;
  date_depense: string;
  date_facturation?: string | null;
  numero_facture?: string | null;
  fournisseur?: string | null;
  fournisseur_id?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface PrePlanif {
  id: string;
  affaire_id: string;
  besoins_competences?: Record<string, unknown> | null;
  besoins_habilitations?: Record<string, unknown> | null;
  ressources_estimees?: Record<string, unknown> | null;
  total_jours_homme?: number | null;
  total_heures?: number | null;
  charge_par_competence?: Record<string, unknown> | null;
  contraintes_calendrier?: string | null;
  contraintes_techniques?: string | null;
  contraintes_rh?: string | null;
  risques?: string | null;
  commentaire?: string | null;
  valide_par?: string | null;
  date_validation?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface DocumentAffaire {
  id: string;
  affaire_id: string;
  nom_fichier: string;
  type_document?: string | null;
  url_storage?: string | null;
  taille_octets?: number | null;
  description?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface LotAffaire {
  id: string;
  affaire_id: string;
  numero_lot: string;
  libelle_lot: string;
  description?: string | null;
  pourcentage_total: number;
  montant_alloue?: number | null;
  est_jalon_gantt: boolean;
  date_debut_previsionnelle?: string | null;
  date_fin_previsionnelle?: string | null;
  ordre_affichage?: number | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

