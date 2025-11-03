-- Migration: Module Catalogue Calendriers personnalisés par site
-- Permet de créer des calendriers personnalisés pour chaque site avec définition des jours ouvrés, fériés, et heures travaillées

-- ============================================================================
-- 1️⃣ TABLE: tbl_calendriers (Calendriers personnalisés par site)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_calendriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  libelle VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Lien au site (optionnel, NULL = calendrier global)
  site_id UUID REFERENCES public.tbl_sites(site_id) ON DELETE SET NULL,
  
  -- Statut
  actif BOOLEAN DEFAULT true,
  
  -- Année de référence (optionnel, pour faciliter la gestion)
  annee_reference INTEGER,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Contraintes
  CONSTRAINT unique_calendrier_site_libelle UNIQUE (libelle, site_id)
);

CREATE INDEX IF NOT EXISTS idx_calendriers_site_id ON public.tbl_calendriers(site_id);
CREATE INDEX IF NOT EXISTS idx_calendriers_actif ON public.tbl_calendriers(actif);
CREATE INDEX IF NOT EXISTS idx_calendriers_annee ON public.tbl_calendriers(annee_reference);

COMMENT ON TABLE public.tbl_calendriers IS 'Calendriers personnalisés par site pour définir les jours ouvrés, fériés et heures travaillées';

-- ============================================================================
-- 2️⃣ TABLE: tbl_calendrier_jours (Définition des jours du calendrier)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_calendrier_jours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien au calendrier
  calendrier_id UUID NOT NULL REFERENCES public.tbl_calendriers(id) ON DELETE CASCADE,
  
  -- Date
  date_jour DATE NOT NULL,
  
  -- Type de jour
  type_jour VARCHAR(50) NOT NULL CHECK (type_jour IN (
    'ouvre',        -- Jour ouvré normal
    'ferie',        -- Jour férié
    'chome',        -- Jour chômé
    'reduit',       -- Jour à heures réduites
    'exceptionnel'  -- Jour exceptionnel (ex: pont, jour férié décalé)
  )),
  
  -- Heures travaillées (en heures, ex: 7.5, 8.0, 0.0)
  heures_travail DECIMAL(4, 2) DEFAULT 0.0 CHECK (heures_travail >= 0 AND heures_travail <= 24),
  
  -- Description / Libellé
  libelle VARCHAR(255), -- Ex: "Jour de l'an", "Férié décalé", "Pont de l'Ascension"
  
  -- Est récurrent (pour les jours fériés qui se répètent chaque année)
  est_recurrent BOOLEAN DEFAULT false,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Contrainte: une seule définition par date et calendrier
  CONSTRAINT unique_calendrier_jour UNIQUE (calendrier_id, date_jour)
);

CREATE INDEX IF NOT EXISTS idx_calendrier_jours_calendrier_id ON public.tbl_calendrier_jours(calendrier_id);
CREATE INDEX IF NOT EXISTS idx_calendrier_jours_date ON public.tbl_calendrier_jours(date_jour);
CREATE INDEX IF NOT EXISTS idx_calendrier_jours_type ON public.tbl_calendrier_jours(type_jour);
CREATE INDEX IF NOT EXISTS idx_calendrier_jours_recurrent ON public.tbl_calendrier_jours(est_recurrent);

COMMENT ON TABLE public.tbl_calendrier_jours IS 'Définition des jours spécifiques pour chaque calendrier (ouvrés, fériés, heures travaillées)';

-- ============================================================================
-- 3️⃣ Fonctions utilitaires
-- ============================================================================

-- Fonction pour obtenir le nombre d'heures travaillées pour une date donnée et un site
CREATE OR REPLACE FUNCTION public.get_heures_travail_jour(
  p_date DATE,
  p_site_id UUID DEFAULT NULL
)
RETURNS DECIMAL(4, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_heures DECIMAL(4, 2);
  v_calendrier_id UUID;
BEGIN
  -- Chercher un calendrier actif pour ce site (ou global si site_id NULL)
  SELECT id INTO v_calendrier_id
  FROM public.tbl_calendriers
  WHERE actif = true
    AND (p_site_id IS NULL OR site_id = p_site_id)
  ORDER BY 
    CASE WHEN site_id IS NOT NULL THEN 1 ELSE 2 END, -- Priorité: calendrier site > global
    created_at DESC
  LIMIT 1;
  
  -- Si calendrier trouvé, chercher la définition du jour
  IF v_calendrier_id IS NOT NULL THEN
    SELECT heures_travail INTO v_heures
    FROM public.tbl_calendrier_jours
    WHERE calendrier_id = v_calendrier_id
      AND date_jour = p_date;
    
    -- Si trouvé, retourner les heures
    IF v_heures IS NOT NULL THEN
      RETURN v_heures;
    END IF;
    
    -- Si pas de définition spécifique, vérifier le type de jour par défaut
    -- (weekend = 0, jour ouvré = 8h par défaut)
    IF EXTRACT(DOW FROM p_date) IN (0, 6) THEN
      RETURN 0.0; -- Weekend
    ELSE
      RETURN 8.0; -- Jour ouvré par défaut
    END IF;
  ELSE
    -- Pas de calendrier, utiliser la logique par défaut
    IF EXTRACT(DOW FROM p_date) IN (0, 6) THEN
      RETURN 0.0; -- Weekend
    ELSE
      -- Vérifier si c'est un jour férié (table existante)
      IF EXISTS (
        SELECT 1 FROM public.tbl_jours_feries
        WHERE date_ferie = p_date
          AND (p_site_id IS NULL OR site_id = p_site_id OR site_id IS NULL)
      ) THEN
        RETURN 0.0;
      ELSE
        RETURN 8.0; -- Jour ouvré par défaut
      END IF;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_heures_travail_jour IS 'Retourne le nombre d''heures travaillées pour une date donnée selon le calendrier du site';

-- Fonction pour vérifier si une date est un jour ouvré
CREATE OR REPLACE FUNCTION public.is_jour_ouvre(
  p_date DATE,
  p_site_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_heures DECIMAL(4, 2);
BEGIN
  v_heures := public.get_heures_travail_jour(p_date, p_site_id);
  RETURN v_heures > 0;
END;
$$;

COMMENT ON FUNCTION public.is_jour_ouvre IS 'Vérifie si une date est un jour ouvré selon le calendrier du site';

-- ============================================================================
-- 4️⃣ Triggers pour updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_calendrier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendrier_updated_at
  BEFORE UPDATE ON public.tbl_calendriers
  FOR EACH ROW
  EXECUTE FUNCTION update_calendrier_updated_at();

CREATE TRIGGER trigger_update_calendrier_jour_updated_at
  BEFORE UPDATE ON public.tbl_calendrier_jours
  FOR EACH ROW
  EXECUTE FUNCTION update_calendrier_updated_at();

-- ============================================================================
-- 5️⃣ RLS (Row Level Security)
-- ============================================================================
ALTER TABLE public.tbl_calendriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tbl_calendrier_jours ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture pour tous les utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can read calendars" ON public.tbl_calendriers;
CREATE POLICY "Authenticated users can read calendars"
  ON public.tbl_calendriers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read calendar days" ON public.tbl_calendrier_jours;
CREATE POLICY "Authenticated users can read calendar days"
  ON public.tbl_calendrier_jours FOR SELECT
  USING (auth.role() = 'authenticated');

-- Politique: Gestion complète pour les administrateurs
DROP POLICY IF EXISTS "Admins can manage calendars" ON public.tbl_calendriers;
CREATE POLICY "Admins can manage calendars"
  ON public.tbl_calendriers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'Administrateur'
    )
  );

DROP POLICY IF EXISTS "Admins can manage calendar days" ON public.tbl_calendrier_jours;
CREATE POLICY "Admins can manage calendar days"
  ON public.tbl_calendrier_jours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'Administrateur'
    )
  );

