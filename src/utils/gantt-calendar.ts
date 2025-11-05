/**
 * Utilitaires pour le calcul des jours ouvrés et heures de travail dans le Gantt
 */

/**
 * Vérifie si une date est un jour ouvré (lundi-vendredi, pas férié)
 * Pour l'instant, on utilise une logique simple basée sur le jour de la semaine
 * TODO: Intégrer la vérification des jours fériés depuis le calendrier
 */
export function isJourOuvre(date: Date): boolean {
  const jour = date.getDay(); // 0 = dimanche, 6 = samedi
  return jour >= 1 && jour <= 5; // Lundi à vendredi
}

/**
 * Récupère tous les jours ouvrés dans une plage de dates
 */
export function getJoursOuvres(dateDebut: Date, dateFin: Date): Date[] {
  const joursOuvres: Date[] = [];
  const dateCourante = new Date(dateDebut);
  
  while (dateCourante <= dateFin) {
    if (isJourOuvre(dateCourante)) {
      joursOuvres.push(new Date(dateCourante));
    }
    dateCourante.setDate(dateCourante.getDate() + 1);
  }
  
  return joursOuvres;
}

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 * @param dateDebut Date de début (incluse)
 * @param dateFin Date de fin (excluse pour le calcul de position, incluse pour la durée)
 * @param inclureDateFin Si true, la date de fin est incluse (pour la durée). Si false, elle est exclue (pour la position).
 */
export function getNombreJoursOuvres(dateDebut: Date, dateFin: Date, inclureDateFin: boolean = true): number {
  if (inclureDateFin) {
    return getJoursOuvres(dateDebut, dateFin).length;
  } else {
    // Pour le calcul de position, on exclut la date de fin
    const dateFinExclue = new Date(dateFin);
    dateFinExclue.setDate(dateFinExclue.getDate() - 1);
    return getJoursOuvres(dateDebut, dateFinExclue).length;
  }
}

/**
 * Définit l'heure de début d'une date selon le calendrier
 * Par défaut: 8h00 (peut être personnalisé selon le calendrier)
 */
export function setHeureDebutCalendrier(
  date: Date,
  heureDebut: number = 8
): Date {
  const nouvelleDate = new Date(date);
  nouvelleDate.setHours(heureDebut, 0, 0, 0);
  return nouvelleDate;
}

/**
 * Trouve le prochain jour ouvré à partir d'une date
 */
export function getProchainJourOuvre(date: Date): Date {
  const dateCourante = new Date(date);
  dateCourante.setDate(dateCourante.getDate() + 1);
  
  while (!isJourOuvre(dateCourante)) {
    dateCourante.setDate(dateCourante.getDate() + 1);
  }
  
  return dateCourante;
}

/**
 * Trouve le jour ouvré précédent à partir d'une date
 */
export function getJourOuvrePrecedent(date: Date): Date {
  const dateCourante = new Date(date);
  dateCourante.setDate(dateCourante.getDate() - 1);
  
  while (!isJourOuvre(dateCourante)) {
    dateCourante.setDate(dateCourante.getDate() - 1);
  }
  
  return dateCourante;
}

/**
 * Aligne une date sur le jour ouvré le plus proche et définit l'heure de début
 */
export function alignerSurJourOuvre(
  date: Date,
  heureDebut: number = 8,
  alignerVersAvant: boolean = false
): Date {
  let dateAligned: Date;
  
  if (isJourOuvre(date)) {
    dateAligned = new Date(date);
  } else {
    if (alignerVersAvant) {
      dateAligned = getJourOuvrePrecedent(date);
    } else {
      dateAligned = getProchainJourOuvre(date);
    }
  }
  
  return setHeureDebutCalendrier(dateAligned, heureDebut);
}

/**
 * Trouve le lundi précédent d'une date (ou le lundi de la même semaine si c'est déjà un lundi)
 */
export function getLundiPrecedent(date: Date): Date {
  const dateCourante = new Date(date);
  const jour = dateCourante.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  
  // Si c'est dimanche (0), on remonte de 6 jours pour avoir le lundi précédent
  // Si c'est lundi (1), on reste sur le lundi
  // Sinon, on remonte jusqu'au lundi de la semaine
  let joursARemonter = 0;
  if (jour === 0) {
    joursARemonter = 6; // Dimanche -> lundi précédent
  } else if (jour > 1) {
    joursARemonter = jour - 1; // Mardi à samedi -> lundi de la semaine
  }
  
  dateCourante.setDate(dateCourante.getDate() - joursARemonter);
  return dateCourante;
}

/**
 * Trouve le lundi entre 5 et 7 jours avant une date donnée
 */
export function getLundiReference(dateMin: Date): Date {
  // Soustraire 6 jours pour être au milieu de la plage 5-7 jours
  const dateReference = new Date(dateMin);
  dateReference.setDate(dateReference.getDate() - 6);
  dateReference.setHours(8, 0, 0, 0);
  
  // Trouver le lundi précédent (ou le lundi de cette semaine)
  const lundi = getLundiPrecedent(dateReference);
  lundi.setHours(8, 0, 0, 0);
  
  return lundi;
}

