// Types pour le Module 4 : Planification & Suivi

export type TypeHoraire = 'jour' | 'nuit' | 'weekend' | 'ferie';
export type StatutActivite = 'planifiee' | 'lancee' | 'suspendue' | 'reportee' | 'terminee' | 'annulee';
export type StatutAffectation = 'planifiee' | 'en_cours' | 'suspendue' | 'terminee' | 'annulee';
export type StatutSuivi = 'en_cours' | 'terminee' | 'suspendue' | 'reportee';
export type TypeDependance = 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, etc.
export type TypeAlerte = 'surcharge' | 'retard' | 'absence' | 'non_conformite' | 'claim' | 'suraffectation';
export type GraviteAlerte = 'info' | 'warning' | 'error' | 'critical';
export type StatutAlerte = 'active' | 'resolue' | 'archivee';

export interface ActivitePlanification {
  id: string;
  affaire_id: string;
  lot_id?: string | null;
  site_id?: string | null;
  numero_activite?: string | null;
  libelle: string;
  description?: string | null;
  date_debut_prevue: string;
  date_fin_prevue: string;
  date_debut_reelle?: string | null;
  date_fin_reelle?: string | null;
  responsable_id?: string | null;
  heures_prevues: number;
  heures_reelles: number;
  type_horaire: TypeHoraire;
  coefficient: number;
  statut: StatutActivite;
  pourcentage_avancement: number;
  activite_precedente_id?: string | null;
  type_dependance?: TypeDependance | null;
  commentaire?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Relations
  affaire?: {
    id: string;
    numero: string;
    libelle: string;
  } | null;
  lot?: {
    id: string;
    numero_lot: string;
    libelle_lot: string;
  } | null;
  site?: {
    site_id: string;
    site_code: string;
    site_label: string;
  } | null;
  responsable?: {
    id: string;
    nom: string;
    prenom: string;
  } | null;
}

export interface AffectationPlanification {
  id: string;
  activite_id: string;
  collaborateur_id: string;
  date_debut_affectation: string;
  date_fin_affectation: string;
  heures_prevues_affectees: number;
  heures_reelles_saisies: number;
  type_horaire: TypeHoraire;
  coefficient: number;
  statut: StatutAffectation;
  commentaire?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Relations
  activite?: ActivitePlanification | null;
  collaborateur?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  } | null;
}

export interface SuiviQuotidien {
  id: string;
  activite_id: string;
  affectation_id?: string | null;
  collaborateur_id: string;
  date_journee: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
  duree_pause_minutes: number;
  heures_reelles: number;
  type_horaire: TypeHoraire;
  coefficient: number;
  pourcentage_avancement_journee: number;
  statut: StatutSuivi;
  commentaire?: string | null;
  photo_url?: string | null;
  anomalie_detectee: boolean;
  claim_id?: string | null;
  validee_par?: string | null;
  date_validation?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Relations
  activite?: ActivitePlanification | null;
  collaborateur?: {
    id: string;
    nom: string;
    prenom: string;
  } | null;
}

export interface CoefficientsPlanification {
  id: string;
  affaire_id?: string | null;
  coefficient_jour: number;
  coefficient_nuit: number;
  coefficient_weekend: number;
  coefficient_ferie: number;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface AlertePlanification {
  id: string;
  type_alerte: TypeAlerte;
  activite_id?: string | null;
  affectation_id?: string | null;
  collaborateur_id?: string | null;
  affaire_id?: string | null;
  message: string;
  gravite: GraviteAlerte;
  statut: StatutAlerte;
  resolue_par?: string | null;
  date_resolution?: string | null;
  created_at: string;
  updated_at: string;
}

// Structure pour le Gantt (format dhtmlx-gantt)
export interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  end_date?: string;
  duration?: number;
  progress?: number;
  parent?: string | null;
  type?: 'task' | 'project' | 'milestone';
  color?: string;
  open?: boolean;
  readonly?: boolean;
  
  // Données métier
  activite_id?: string;
  affaire_id?: string;
  collaborateur_id?: string;
  type_horaire?: TypeHoraire;
  statut?: StatutActivite;
}

