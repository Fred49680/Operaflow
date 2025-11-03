-- Migration: Correction des politiques RLS pour les calendriers
-- Assurer que les admins peuvent lire et gérer tous les calendriers

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Authenticated users can read calendars" ON public.tbl_calendriers;
DROP POLICY IF EXISTS "Admins can manage calendars" ON public.tbl_calendriers;
DROP POLICY IF EXISTS "Authenticated users can read calendar days" ON public.tbl_calendrier_jours;
DROP POLICY IF EXISTS "Admins can manage calendar days" ON public.tbl_calendrier_jours;

-- Politique: Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read calendars"
  ON public.tbl_calendriers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Politique: Gestion complète pour les administrateurs (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage calendars"
  ON public.tbl_calendriers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'Administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'Administrateur'
    )
  );

-- Politique: Lecture des jours pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read calendar days"
  ON public.tbl_calendrier_jours FOR SELECT
  USING (auth.role() = 'authenticated');

-- Politique: Gestion complète des jours pour les administrateurs
CREATE POLICY "Admins can manage calendar days"
  ON public.tbl_calendrier_jours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'Administrateur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'Administrateur'
    )
  );

