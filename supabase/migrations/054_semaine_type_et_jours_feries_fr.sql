-- Migration: Ajout semaine type et génération automatique des jours fériés français
-- Permet de définir une semaine type pour chaque calendrier et génère automatiquement les jours fériés FR jusqu'en 2099

-- ============================================================================
-- 1️⃣ TABLE: tbl_calendrier_semaine_type (Définition de la semaine type)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tbl_calendrier_semaine_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lien au calendrier
  calendrier_id UUID NOT NULL REFERENCES public.tbl_calendriers(id) ON DELETE CASCADE,
  
  -- Jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine >= 0 AND jour_semaine <= 6),
  
  -- Heures travaillées pour ce jour de la semaine
  heures_travail DECIMAL(4, 2) DEFAULT 0.0 CHECK (heures_travail >= 0 AND heures_travail <= 24),
  
  -- Type de jour pour ce jour de la semaine
  type_jour VARCHAR(50) DEFAULT 'ouvre' CHECK (type_jour IN ('ouvre', 'ferie', 'chome', 'reduit', 'exceptionnel')),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Contrainte: une seule définition par jour de semaine et calendrier
  CONSTRAINT unique_semaine_type_jour UNIQUE (calendrier_id, jour_semaine)
);

CREATE INDEX IF NOT EXISTS idx_semaine_type_calendrier_id ON public.tbl_calendrier_semaine_type(calendrier_id);
CREATE INDEX IF NOT EXISTS idx_semaine_type_jour_semaine ON public.tbl_calendrier_semaine_type(jour_semaine);

COMMENT ON TABLE public.tbl_calendrier_semaine_type IS 'Définition de la semaine type pour chaque calendrier (heures travaillées par jour de la semaine)';

-- ============================================================================
-- 2️⃣ Fonction pour calculer la date de Pâques (algorithme de Gauss)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculer_date_paques(p_annee INTEGER)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  a INTEGER;
  b INTEGER;
  c INTEGER;
  d INTEGER;
  e INTEGER;
  f INTEGER;
  g INTEGER;
  h INTEGER;
  i INTEGER;
  k INTEGER;
  l INTEGER;
  m INTEGER;
  n INTEGER;
  p INTEGER;
  q INTEGER;
  jour INTEGER;
  mois INTEGER;
BEGIN
  -- Algorithme de Gauss pour calculer la date de Pâques
  a := p_annee MOD 19;
  b := p_annee / 100;
  c := p_annee MOD 100;
  d := b / 4;
  e := b MOD 4;
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) MOD 30;
  i := c / 4;
  k := c MOD 4;
  l := (32 + 2 * e + 2 * i - h - k) MOD 7;
  m := (a + 11 * h + 22 * l) / 451;
  n := (h + l - 7 * m + 114) / 31;
  p := (h + l - 7 * m + 114) MOD 31;
  
  jour := p + 1;
  mois := n;
  
  RETURN MAKE_DATE(p_annee, mois, jour);
END;
$$;

COMMENT ON FUNCTION public.calculer_date_paques IS 'Calcule la date de Pâques pour une année donnée (algorithme de Gauss)';

-- ============================================================================
-- 3️⃣ Fonction pour générer les jours fériés français pour une année
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generer_jours_feries_fr(
  p_calendrier_id UUID,
  p_annee INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_paques DATE;
  v_lundi_paques DATE;
  v_ascension DATE;
  v_pentecote DATE;
  v_lundi_pentecote DATE;
  v_count INTEGER := 0;
BEGIN
  -- Calculer Pâques pour cette année
  v_paques := public.calculer_date_paques(p_annee);
  v_lundi_paques := v_paques + INTERVAL '1 day';
  v_ascension := v_paques + INTERVAL '39 days';
  v_pentecote := v_paques + INTERVAL '49 days';
  v_lundi_pentecote := v_paques + INTERVAL '50 days';
  
  -- Jours fériés fixes
  -- 1er janvier
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 1, 1), 'chome', 0.0, 'Jour de l''an', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 1er mai
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 5, 1), 'chome', 0.0, 'Fête du Travail', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 8 mai
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 5, 8), 'chome', 0.0, 'Victoire en Europe', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 14 juillet
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 7, 14), 'chome', 0.0, 'Fête Nationale', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 15 août
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 8, 15), 'chome', 0.0, 'Assomption', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 1er novembre
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 11, 1), 'chome', 0.0, 'Toussaint', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 11 novembre
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 11, 11), 'chome', 0.0, 'Armistice', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- 25 décembre
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, MAKE_DATE(p_annee, 12, 25), 'chome', 0.0, 'Noël', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- Jours fériés variables (basés sur Pâques)
  -- Lundi de Pâques
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, v_lundi_paques, 'chome', 0.0, 'Lundi de Pâques', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- Ascension
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, v_ascension, 'chome', 0.0, 'Ascension', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- Lundi de Pentecôte
  INSERT INTO public.tbl_calendrier_jours (calendrier_id, date_jour, type_jour, heures_travail, libelle, est_recurrent)
  VALUES (p_calendrier_id, v_lundi_pentecote, 'chome', 0.0, 'Lundi de Pentecôte', true)
  ON CONFLICT (calendrier_id, date_jour) DO NOTHING;
  
  -- Compter les jours insérés
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.generer_jours_feries_fr IS 'Génère automatiquement les jours fériés français pour une année donnée dans un calendrier';

-- ============================================================================
-- 4️⃣ Fonction pour générer les jours fériés pour une plage d'années
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generer_jours_feries_fr_plage(
  p_calendrier_id UUID,
  p_annee_debut INTEGER,
  p_annee_fin INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_annee INTEGER;
  v_total INTEGER := 0;
BEGIN
  FOR v_annee IN p_annee_debut..p_annee_fin LOOP
    v_total := v_total + public.generer_jours_feries_fr(p_calendrier_id, v_annee);
  END LOOP;
  
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.generer_jours_feries_fr_plage IS 'Génère les jours fériés français pour une plage d''années';

-- ============================================================================
-- 5️⃣ Fonction pour obtenir les heures travaillées selon semaine type et exceptions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_heures_travail_jour_v2(
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
  v_jour_semaine INTEGER;
  v_exception RECORD;
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
  
  -- Si calendrier trouvé
  IF v_calendrier_id IS NOT NULL THEN
    -- 1. Vérifier d'abord s'il y a une exception (jour spécifique défini)
    SELECT * INTO v_exception
    FROM public.tbl_calendrier_jours
    WHERE calendrier_id = v_calendrier_id
      AND date_jour = p_date;
    
    IF FOUND THEN
      RETURN v_exception.heures_travail;
    END IF;
    
    -- 2. Sinon, utiliser la semaine type
    v_jour_semaine := EXTRACT(DOW FROM p_date); -- 0 = dimanche, 6 = samedi
    
    SELECT heures_travail INTO v_heures
    FROM public.tbl_calendrier_semaine_type
    WHERE calendrier_id = v_calendrier_id
      AND jour_semaine = v_jour_semaine;
    
    IF FOUND THEN
      RETURN v_heures;
    END IF;
    
    -- 3. Si pas de semaine type définie, utiliser les valeurs par défaut
    IF v_jour_semaine IN (0, 6) THEN
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

COMMENT ON FUNCTION public.get_heures_travail_jour_v2 IS 'Retourne le nombre d''heures travaillées selon la semaine type et les exceptions';

-- ============================================================================
-- 6️⃣ Triggers pour updated_at
-- ============================================================================
CREATE TRIGGER trigger_update_semaine_type_updated_at
  BEFORE UPDATE ON public.tbl_calendrier_semaine_type
  FOR EACH ROW
  EXECUTE FUNCTION update_calendrier_updated_at();

-- ============================================================================
-- 7️⃣ RLS pour semaine type
-- ============================================================================
ALTER TABLE public.tbl_calendrier_semaine_type ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read semaine type" ON public.tbl_calendrier_semaine_type;
CREATE POLICY "Authenticated users can read semaine type"
  ON public.tbl_calendrier_semaine_type FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage semaine type" ON public.tbl_calendrier_semaine_type;
CREATE POLICY "Admins can manage semaine type"
  ON public.tbl_calendrier_semaine_type FOR ALL
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

