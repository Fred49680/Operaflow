# Debug : Activités non affichées

## Problème
Deux activités existent dans `tbl_planification_activites` mais l'application affiche "0 activité".

## Causes possibles

### 1. Dates manquantes (date_debut_prevue / date_fin_prevue)
Le Gantt filtre les activités sans dates (ligne 126 de `GanttTimeline.tsx`).
**Solution** : Vérifier dans Supabase que les colonnes `date_debut_prevue` et `date_fin_prevue` sont remplies.

### 2. RLS (Row Level Security)
Les politiques RLS peuvent bloquer l'accès selon le rôle utilisateur.
**Vérification** :
- Ouvrir la console du navigateur (F12)
- Regarder les logs : `[Planification] X activité(s) récupérée(s) depuis Supabase`
- Si `X = 0`, c'est un problème RLS
- Si `X = 2`, c'est un problème de filtrage côté client

### 3. Filtres côté client
Le compteur utilise `filteredActivites` qui peut être vide si :
- `selectedAffaireGantt` est défini mais ne correspond pas aux `affaire_id` des activités
- Les filtres (site, responsable, statut) excluent les activités

## Actions à prendre

1. **Vérifier les dates dans Supabase** :
   ```sql
   SELECT id, libelle, date_debut_prevue, date_fin_prevue 
   FROM tbl_planification_activites;
   ```

2. **Vérifier les logs console** dans le navigateur

3. **Vérifier le rôle utilisateur** : Admin ou Planificateur voient tout

4. **Tester sans filtres** : Vider tous les filtres dans l'interface

