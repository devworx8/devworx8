-- Deactivate invalid per-school age-group rows for Young Eagles.
-- Invalid here means an active row with null month bounds.

DO $$
DECLARE
  v_school_id UUID;
  v_rows INTEGER := 0;
BEGIN
  -- Prefer known production ID.
  SELECT id
  INTO v_school_id
  FROM public.preschools
  WHERE id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'
  LIMIT 1;

  -- Fallback by school name if the ID is not present in this environment.
  IF v_school_id IS NULL THEN
    SELECT id
    INTO v_school_id
    FROM public.preschools
    WHERE lower(name) = 'young eagles'
    LIMIT 1;
  END IF;

  IF v_school_id IS NULL THEN
    RAISE NOTICE 'Young Eagles school not found; skipping migration.';
    RETURN;
  END IF;

  UPDATE public.age_groups
  SET is_active = false
  WHERE preschool_id = v_school_id
    AND coalesce(is_active, false) = true
    AND (min_age_months IS NULL OR max_age_months IS NULL);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Deactivated % invalid age_groups rows for school %', v_rows, v_school_id;
END $$;
