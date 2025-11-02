-- Migration 038 : Correction RLS planification et vue catalogue_formations
-- Projet : OperaFlow
-- Description : Corriger les politiques RLS pour permettre aux planificateurs de voir toutes les activités
-- Date : 2025-01-11

-- 1️⃣ Correction de la vue v_alertes_formations (déjà corrigée dans 037, mais si pas déployée)
-- Pas besoin de refaire, déjà corrigé dans 037

-- 2️⃣ Correction des politiques RLS pour tbl_planification_activites
-- Les planificateurs doivent voir TOUTES les activités, pas seulement celles de leur site

-- Supprimer l'ancienne politique de lecture
DROP POLICY IF EXISTS "Users can read activities in their sites" ON public.tbl_planification_activites;

-- Nouvelle politique : Planificateurs/Admins voient tout, autres utilisateurs voient selon leur périmètre
CREATE POLICY "Users can read activities based on role"
    ON public.tbl_planification_activites FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Admin voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name = 'Administrateur'
            ) OR
            -- Planificateur voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name = 'Planificateur'
            ) OR
            -- Responsable d'Activité voit les activités de ses sites
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() 
                AND r.name = 'Responsable d''Activité'
                AND (
                    ur.site_id::UUID = tbl_planification_activites.site_id
                    OR EXISTS (
                        SELECT 1 FROM public.tbl_affaires a
                        WHERE a.id = tbl_planification_activites.affaire_id
                        AND a.site_id = ur.site_id::UUID
                    )
                )
            ) OR
            -- Chargé d'Affaires voit les activités de ses affaires
            EXISTS (
                SELECT 1 FROM public.tbl_affaires a
                WHERE a.id = tbl_planification_activites.affaire_id
                AND a.charge_affaires_id IN (
                    SELECT c.id FROM public.collaborateurs c WHERE c.user_id = auth.uid()
                )
            ) OR
            -- Techniciens/Chefs de chantier voient les activités où ils sont affectés
            EXISTS (
                SELECT 1 FROM public.tbl_planification_affectations pa
                WHERE pa.activite_id = tbl_planification_activites.id
                AND pa.collaborateur_id IN (
                    SELECT c.id FROM public.collaborateurs c WHERE c.user_id = auth.uid()
                )
            )
        )
    );

-- La politique de gestion reste inchangée (seuls Admin/Planificateur/Responsable peuvent modifier)
-- Pas besoin de modifier, elle est déjà correcte

COMMENT ON POLICY "Users can read activities based on role" ON public.tbl_planification_activites IS 
    'Politique RLS permettant aux planificateurs et admins de voir toutes les activités, et aux autres rôles selon leur périmètre';

