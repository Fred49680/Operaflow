# 📋 Conception du Module Gantt - Approche Étape par Étape

## 🎯 Objectif
Créer un module Gantt simple, maintenable et performant, sans dépendances externes lourdes.

---

## 📐 Architecture Globale

### Structure des composants
```
src/components/planification/
├── gantt/
│   ├── GanttTimeline.tsx          # Composant principal (étape 1)
│   ├── GanttBar.tsx               # Barre d'activité (étape 1)
│   ├── GanttHeader.tsx            # En-tête avec dates (étape 1)
│   ├── GanttGrid.tsx              # Grille de timeline (étape 1)
│   ├── useGanttDrag.ts            # Hook drag & drop (étape 2)
│   ├── useGanttResize.ts           # Hook redimensionnement (étape 3)
│   └── GanttFilters.tsx           # Composant filtres (étape 4)
```

---

## 🏗️ Étape 1 : Affichage Basique des Activités en Timeline

### Objectif
Afficher les activités sous forme de barres horizontales sur une timeline.

### Composants à créer

#### 1. `GanttHeader.tsx`
- **Rôle** : Afficher l'en-tête avec les dates (jours/semaines/mois)
- **Props** :
  ```typescript
  {
    dateDebut: Date;
    dateFin: Date;
    vue: 'jour' | 'semaine' | 'mois';
  }
  ```
- **Fonctionnalités** :
  - Calculer les colonnes de dates selon la vue
  - Afficher les dates en en-tête

#### 2. `GanttBar.tsx`
- **Rôle** : Représenter une activité sous forme de barre
- **Props** :
  ```typescript
  {
    activite: ActivitePlanification;
    dateDebutTimeline: Date;
    dateFinTimeline: Date;
    vue: 'jour' | 'semaine' | 'mois';
    onClick?: () => void;
  }
  ```
- **Fonctionnalités** :
  - Calculer la position et la largeur de la barre
  - Afficher le libellé
  - Colorer selon statut/type horaire
  - Afficher le pourcentage d'avancement

#### 3. `GanttGrid.tsx`
- **Rôle** : Grille de timeline avec lignes et colonnes
- **Props** :
  ```typescript
  {
    activites: ActivitePlanification[];
    dateDebut: Date;
    dateFin: Date;
    vue: 'jour' | 'semaine' | 'mois';
  }
  ```
- **Fonctionnalités** :
  - Dessiner la grille (lignes verticales pour dates)
  - Positionner les barres d'activités
  - Gérer le scroll horizontal

#### 4. `GanttTimeline.tsx` (Composant principal)
- **Rôle** : Orchestrer tous les composants
- **Props** :
  ```typescript
  {
    activites: ActivitePlanification[];
    dateDebut?: Date;
    dateFin?: Date;
    vue?: 'jour' | 'semaine' | 'mois';
    onActiviteClick?: (activite: ActivitePlanification) => void;
  }
  ```
- **Fonctionnalités** :
  - Calculer la plage de dates si non fournie
  - Gérer la vue (jour/semaine/mois)
  - Intégrer GanttHeader, GanttGrid et GanttBar

### Calculs nécessaires

#### Position d'une barre
```typescript
function calculerPositionBarre(
  activite: ActivitePlanification,
  dateDebutTimeline: Date,
  dateFinTimeline: Date,
  largeurTotale: number
): { left: number; width: number } {
  const dureeTotale = dateFinTimeline.getTime() - dateDebutTimeline.getTime();
  const debutBarre = new Date(activite.date_debut_prevue).getTime() - dateDebutTimeline.getTime();
  const dureeBarre = new Date(activite.date_fin_prevue).getTime() - new Date(activite.date_debut_prevue).getTime();
  
  return {
    left: (debutBarre / dureeTotale) * largeurTotale,
    width: (dureeBarre / dureeTotale) * largeurTotale,
  };
}
```

#### Couleur selon statut/type horaire
```typescript
function getCouleurActivite(activite: ActivitePlanification): string {
  if (activite.statut === 'terminee') return '#10b981'; // vert
  if (activite.statut === 'suspendue') return '#94a3b8'; // gris
  if (activite.type_horaire === 'nuit') return '#3b82f6'; // bleu
  if (activite.type_horaire === 'weekend') return '#f59e0b'; // orange
  if (activite.type_horaire === 'ferie') return '#ef4444'; // rouge
  return '#6366f1'; // indigo par défaut
}
```

---

## 🎯 Étape 2 : Drag & Drop des Activités

### Objectif
Permettre de déplacer les activités sur la timeline.

### Hook à créer : `useGanttDrag.ts`

```typescript
function useGanttDrag(
  activite: ActivitePlanification,
  dateDebutTimeline: Date,
  dateFinTimeline: Date,
  onDragEnd: (nouvelleDateDebut: Date) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  
  // Gérer mousedown/touchstart
  // Gérer mousemove/touchmove (calculer nouvelle position)
  // Gérer mouseup/touchend (appeler onDragEnd)
  
  return {
    isDragging,
    onMouseDown: (e: MouseEvent) => { /* ... */ },
    // ...
  };
}
```

### Intégration dans `GanttBar.tsx`
- Ajouter les handlers drag
- Afficher un feedback visuel pendant le drag
- Calculer la nouvelle date en fonction de la position

---

## 📏 Étape 3 : Redimensionnement des Activités

### Objectif
Permettre de redimensionner les activités (début ou fin).

### Hook à créer : `useGanttResize.ts`

```typescript
function useGanttResize(
  activite: ActivitePlanification,
  dateDebutTimeline: Date,
  dateFinTimeline: Date,
  onResizeEnd: (nouvelleDateDebut: Date, nouvelleDateFin: Date) => void
) {
  // Similar to useGanttDrag but for resizing
  // Gérer les handles gauche/droite
}
```

### Intégration dans `GanttBar.tsx`
- Ajouter des handles de redimensionnement aux extrémités
- Limiter le redimensionnement (date min/max)
- Afficher un feedback visuel

---

## 🔍 Étape 4 : Filtres et Vues (Jour/Semaine/Mois)

### Objectif
Ajouter des filtres et changer la vue temporelle.

### Composant : `GanttFilters.tsx`

- **Filtres** :
  - Site
  - Affaire
  - Statut
  - Responsable

- **Vues** :
  - Jour : affichage heure par heure
  - Semaine : affichage jour par jour
  - Mois : affichage semaine par semaine

### Intégration dans `GanttTimeline.tsx`
- Gérer l'état des filtres
- Calculer la grille selon la vue
- Filtrer les activités

---

## 👥 Étape 5 : Affectation Ressources aux Activités

### Objectif
Afficher les ressources affectées à chaque activité et permettre l'affectation.

### Modifications

#### Dans `GanttBar.tsx`
- Afficher les avatars/badges des ressources
- Afficher un indicateur si surcharge

#### Nouveau composant : `GanttResourcePanel.tsx`
- Liste des ressources disponibles
- Drag & drop pour affecter une ressource à une activité
- Afficher la charge de chaque ressource

---

## 🎨 Design System

### Couleurs
- **Jour** : `#6366f1` (indigo)
- **Nuit** : `#3b82f6` (bleu)
- **Week-end** : `#f59e0b` (orange)
- **Férié** : `#ef4444` (rouge)
- **Terminée** : `#10b981` (vert)
- **Suspendue** : `#94a3b8` (gris)

### Tailles
- **Hauteur barre** : 32px
- **Espacement entre barres** : 8px
- **Hauteur ligne** : 40px
- **Padding timeline** : 16px

---

## 📦 Technologies Utilisées

- **React** : Composants fonctionnels avec hooks
- **TypeScript** : Typage strict
- **TailwindCSS** : Styling
- **date-fns** : Manipulation des dates (déjà dans le projet)

---

## ✅ Checklist de Développement

### Étape 1 ✅
- [ ] Créer `GanttHeader.tsx`
- [ ] Créer `GanttBar.tsx`
- [ ] Créer `GanttGrid.tsx`
- [ ] Créer `GanttTimeline.tsx`
- [ ] Intégrer dans `planification-client.tsx`
- [ ] Tests d'affichage

### Étape 2
- [ ] Créer `useGanttDrag.ts`
- [ ] Intégrer drag dans `GanttBar.tsx`
- [ ] API route pour mise à jour date
- [ ] Tests drag & drop

### Étape 3
- [ ] Créer `useGanttResize.ts`
- [ ] Intégrer resize dans `GanttBar.tsx`
- [ ] API route pour mise à jour dates
- [ ] Tests redimensionnement

### Étape 4
- [ ] Créer `GanttFilters.tsx`
- [ ] Ajouter système de vues
- [ ] Intégrer filtres dans `GanttTimeline.tsx`
- [ ] Tests filtres et vues

### Étape 5
- [ ] Modifier `GanttBar.tsx` pour afficher ressources
- [ ] Créer `GanttResourcePanel.tsx`
- [ ] API routes pour affectations
- [ ] Tests affectation ressources

---

## 🚀 Démarrage

Commencer par l'**Étape 1** : Créer les composants de base pour afficher les activités sur une timeline simple.

Une fois l'étape 1 validée, passer à l'étape 2, etc.

