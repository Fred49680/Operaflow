-- Migration 045 : Correction récursion dans politiques RLS collaborateurs
-- Projet : OperaFlow
-- Description : Corriger les politiques RLS récursives sur collaborateurs
-- Date : 2025-01-11

-- ============================================================================
-- 1️⃣ Corriger la politique "Responsables can read their team" qui cause récursion
-- ============================================================================
DROP POLICY IF EXISTS "Responsables can read their team" ON public.collaborateurs;

-- Nouvelle politique utilisant une fonction SECURITY DEFINER pour éviter récursion
CREATE OR REPLACE FUNCTION public.get_collaborateur_id_for_user_safe(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
PARALLEL SAFE
AS $$
    -- Accès direct à la table, SECURITY DEFINER bypass RLS
    SELECT id 
    FROM public.collaborateurs
    WHERE user_id = p_user_id
    LIMIT 1;
$$;

CREATE POLICY "Responsables can read their team" ON public.collaborateurs
  FOR SELECT USING (
    responsable_id = public.get_collaborateur_id_for_user_safe((select auth.uid()))
  );

-- ============================================================================
-- 2️⃣ Corriger aussi la politique d'insertion
-- ============================================================================
DROP POLICY IF EXISTS "Responsables can insert team members" ON public.collaborateurs;

CREATE POLICY "Responsables can insert team members" ON public.collaborateurs
  FOR INSERT WITH CHECK (
    responsable_id = public.get_collaborateur_id_for_user_safe((select auth.uid()))
  );

COMMENT ON FUNCTION public.get_collaborateur_id_for_user_safe(UUID) IS 
    'Fonction SECURITY DEFINER pour obtenir collaborateur_id sans déclencher récursion RLS';

