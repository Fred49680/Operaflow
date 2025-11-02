-- Migration 040 : Optimisation performances RLS (auth_rls_initplan)
-- Projet : OperaFlow
-- Description : Remplacer auth.uid() et auth.role() par (select auth.uid()) et (select auth.role())
-- pour éviter la réévaluation à chaque ligne selon recommandations Supabase
-- Date : 2025-01-11
-- Référence : https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- 1️⃣ TABLE: tbl_users
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.tbl_users;
CREATE POLICY "Users can read own profile" ON public.tbl_users
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can read all users" ON public.tbl_users;
CREATE POLICY "Admins can read all users" ON public.tbl_users
  FOR SELECT USING (public.is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage all users" ON public.tbl_users;
CREATE POLICY "Admins can manage all users" ON public.tbl_users
  FOR ALL USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- 2️⃣ TABLE: user_roles
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can read all user_roles" ON public.user_roles;
CREATE POLICY "Admins can read all user_roles" ON public.user_roles
  FOR SELECT USING (public.is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can manage all user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage all user_roles" ON public.user_roles
  FOR ALL USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- 3️⃣ TABLE: roles
-- ============================================================================
DROP POLICY IF EXISTS "Users can read roles" ON public.roles;
CREATE POLICY "Users can read roles" ON public.roles
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- 4️⃣ TABLE: tbl_permissions
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.tbl_permissions;
CREATE POLICY "Authenticated users can read permissions" ON public.tbl_permissions
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.tbl_permissions;
CREATE POLICY "Admins can manage permissions" ON public.tbl_permissions
  FOR ALL USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- 5️⃣ TABLE: tbl_user_requests
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own requests" ON public.tbl_user_requests;
CREATE POLICY "Users can view own requests" ON public.tbl_user_requests
  FOR SELECT USING (
    demandeur_id = (select auth.uid()) OR
    demandeur_id IS NULL
  );

DROP POLICY IF EXISTS "Admins can view all requests" ON public.tbl_user_requests;
CREATE POLICY "Admins can view all requests" ON public.tbl_user_requests
  FOR SELECT USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- 6️⃣ TABLE: tbl_sessions
-- ============================================================================
DROP POLICY IF EXISTS "Users can create own sessions" ON public.tbl_sessions;
CREATE POLICY "Users can create own sessions" ON public.tbl_sessions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own sessions" ON public.tbl_sessions;
CREATE POLICY "Users can view own sessions" ON public.tbl_sessions
  FOR SELECT USING (user_id = (select auth.uid()));

-- ============================================================================
-- 7️⃣ TABLE: tbl_audit_log
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.tbl_audit_log;
CREATE POLICY "Admins can view audit logs" ON public.tbl_audit_log
  FOR SELECT USING (public.is_admin((select auth.uid())));

-- ============================================================================
-- 8️⃣ TABLE: tbl_sites
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view active sites" ON public.tbl_sites;
CREATE POLICY "Authenticated users can view active sites" ON public.tbl_sites
  FOR SELECT USING ((select auth.role()) = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "RH/Admin can view all sites" ON public.tbl_sites;
CREATE POLICY "RH/Admin can view all sites" ON public.tbl_sites
  FOR SELECT USING (
    public.is_rh_or_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "RH/Admin can manage all sites" ON public.tbl_sites;
CREATE POLICY "RH/Admin can manage all sites" ON public.tbl_sites
  FOR ALL USING (
    public.is_rh_or_admin((select auth.uid()))
  );

-- ============================================================================
-- 9️⃣ TABLE: tbl_site_responsables
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view site responsables" ON public.tbl_site_responsables;
CREATE POLICY "Authenticated users can view site responsables" ON public.tbl_site_responsables
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "RH/Admin can manage site responsables" ON public.tbl_site_responsables;
CREATE POLICY "RH/Admin can manage site responsables" ON public.tbl_site_responsables
  FOR ALL USING (
    public.is_rh_or_admin((select auth.uid()))
  );

-- ============================================================================
-- 🔟 TABLE: collaborateurs
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own collaborateur profile" ON public.collaborateurs;
CREATE POLICY "Users can read own collaborateur profile" ON public.collaborateurs
  FOR SELECT USING (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own profile" ON public.collaborateurs;
CREATE POLICY "Users can create own profile" ON public.collaborateurs
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.collaborateurs;
CREATE POLICY "Users can update own profile" ON public.collaborateurs
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "RH/Admin can read all collaborateurs" ON public.collaborateurs;
CREATE POLICY "RH/Admin can read all collaborateurs" ON public.collaborateurs
  FOR SELECT USING (
    public.is_rh_or_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "RH/Admin can insert collaborateurs" ON public.collaborateurs;
CREATE POLICY "RH/Admin can insert collaborateurs" ON public.collaborateurs
  FOR INSERT WITH CHECK (
    public.is_rh_or_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "RH/Admin can update all collaborateurs" ON public.collaborateurs;
CREATE POLICY "RH/Admin can update all collaborateurs" ON public.collaborateurs
  FOR UPDATE USING (
    public.is_rh_or_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "RH/Admin can delete all collaborateurs" ON public.collaborateurs;
CREATE POLICY "RH/Admin can delete all collaborateurs" ON public.collaborateurs
  FOR DELETE USING (
    public.is_rh_or_admin((select auth.uid()))
  );

DROP POLICY IF EXISTS "Responsables can read their team" ON public.collaborateurs;
CREATE POLICY "Responsables can read their team" ON public.collaborateurs
  FOR SELECT USING (
    responsable_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Responsables can insert team members" ON public.collaborateurs;
CREATE POLICY "Responsables can insert team members" ON public.collaborateurs
  FOR INSERT WITH CHECK (
    responsable_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 1️⃣1️⃣ TABLE: tbl_affaires
-- ============================================================================
DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent voir les affaires" ON public.tbl_affaires;
CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les affaires" ON public.tbl_affaires
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Chargé d'affaires et RH/Admin peuvent créer des affaires" ON public.tbl_affaires;
CREATE POLICY "Chargé d'affaires et RH/Admin peuvent créer des affaires" ON public.tbl_affaires
  FOR INSERT WITH CHECK (
    public.is_rh_or_admin((select auth.uid())) OR
    charge_affaires_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Chargé d'affaires et RH/Admin peuvent modifier les affaires" ON public.tbl_affaires;
CREATE POLICY "Chargé d'affaires et RH/Admin peuvent modifier les affaires" ON public.tbl_affaires
  FOR UPDATE USING (
    public.is_rh_or_admin((select auth.uid())) OR
    charge_affaires_id IN (
      SELECT id FROM public.collaborateurs WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 1️⃣2️⃣ TABLE: tbl_planification_activites
-- ============================================================================
DROP POLICY IF EXISTS "Users can read activities based on role" ON public.tbl_planification_activites;
CREATE POLICY "Users can read activities based on role"
    ON public.tbl_planification_activites FOR SELECT
    USING (
        (select auth.role()) = 'authenticated' AND (
            -- Admin voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Administrateur'
            ) OR
            -- Planificateur voit tout
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name = 'Planificateur'
            ) OR
            -- Responsable d'Activité voit les activités de ses sites
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) 
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
                    SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
                )
            ) OR
            -- Techniciens/Chefs de chantier voient les activités où ils sont affectés
            EXISTS (
                SELECT 1 FROM public.tbl_planification_affectations pa
                WHERE pa.activite_id = tbl_planification_activites.id
                AND pa.collaborateur_id IN (
                    SELECT c.id FROM public.collaborateurs c WHERE c.user_id = (select auth.uid())
                )
            )
        )
    );

DROP POLICY IF EXISTS "Users can manage activities in their scope" ON public.tbl_planification_activites;
CREATE POLICY "Users can manage activities in their scope"
    ON public.tbl_planification_activites FOR ALL
    USING (
        (select auth.role()) = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = (select auth.uid()) AND r.name IN ('Administrateur', 'Planificateur', 'Responsable d''Activité', 'Chargé d''Affaires')
            )
        )
    );

COMMENT ON POLICY "Users can read activities based on role" ON public.tbl_planification_activites IS 
    'Politique RLS optimisée (select auth.uid()) pour performance';

COMMENT ON POLICY "Users can manage activities in their scope" ON public.tbl_planification_activites IS 
    'Politique RLS optimisée (select auth.uid()) pour performance';

-- Note: Les autres tables suivront dans une migration ultérieure si nécessaire
-- Cette migration traite les tables les plus critiques et fréquemment utilisées

