-- Publish year plan: set is_published on terms, curriculum themes, and optional monthly entries
-- so teachers can use the plan for lesson alignment (loadQuickLessonThemeContext sees published themes).

BEGIN;
CREATE OR REPLACE FUNCTION public.publish_year_plan(
  p_preschool_id uuid,
  p_academic_year integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_caller uuid;
  v_year integer;
  v_terms_updated integer := 0;
  v_themes_updated integer := 0;
  v_monthly_updated integer := 0;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_preschool_id IS NULL THEN
    RAISE EXCEPTION 'p_preschool_id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.id = v_caller OR p.auth_user_id = v_caller)
      AND p.role IN ('principal', 'principal_admin', 'admin', 'super_admin', 'superadmin')
      AND COALESCE(p.organization_id, p.preschool_id) = p_preschool_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to publish year plan for this preschool' USING ERRCODE = '42501';
  END IF;

  v_year := NULLIF(p_academic_year, 0);
  IF v_year IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  END IF;

  -- Publish academic terms for this preschool + academic year
  WITH updated AS (
    UPDATE public.academic_terms
    SET is_published = true,
        updated_at = now()
    WHERE preschool_id = p_preschool_id
      AND academic_year = v_year
    RETURNING id
  )
  SELECT count(*)::integer INTO v_terms_updated FROM updated;

  -- Publish curriculum themes that belong to those terms
  WITH updated AS (
    UPDATE public.curriculum_themes ct
    SET is_published = true,
        updated_at = now()
    FROM public.academic_terms at
    WHERE ct.term_id = at.id
      AND at.preschool_id = p_preschool_id
      AND at.academic_year = v_year
    RETURNING ct.id
  )
  SELECT count(*)::integer INTO v_themes_updated FROM updated;

  -- Publish monthly entries for this preschool + academic year (optional; makes them visible if UI filters by is_published)
  IF to_regclass('public.year_plan_monthly_entries') IS NOT NULL THEN
    WITH updated AS (
      UPDATE public.year_plan_monthly_entries
      SET is_published = true,
          updated_at = now()
      WHERE preschool_id = p_preschool_id
        AND academic_year = v_year
      RETURNING id
    )
    SELECT count(*)::integer INTO v_monthly_updated FROM updated;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'academic_year', v_year,
    'terms_published', v_terms_updated,
    'themes_published', v_themes_updated,
    'monthly_entries_published', v_monthly_updated
  );
END;
$$;

COMMENT ON FUNCTION public.publish_year_plan(uuid, integer) IS
  'Publishes the year plan for a preschool and academic year: sets is_published on academic_terms, curriculum_themes, and year_plan_monthly_entries so teachers can use themes for lesson alignment.';

GRANT EXECUTE ON FUNCTION public.publish_year_plan(uuid, integer) TO authenticated;
COMMIT;
