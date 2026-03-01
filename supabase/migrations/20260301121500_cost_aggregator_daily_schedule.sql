-- Schedule daily execution for cost-aggregator Edge Function.
-- Uses cron secret first; falls back to an existing cron Bearer token if available.

DO $$
DECLARE
  v_url text;
  v_cron_secret text;
  v_existing_bearer text;
  v_auth_token text;
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;

  -- Remove any previous job before re-scheduling.
  BEGIN
    PERFORM cron.unschedule('cost-aggregator-daily');
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  v_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    current_setting('app.supabase_url', true),
    'https://lvvvjywrmpcqrpvuptdi.supabase.co'
  );

  v_cron_secret := coalesce(
    nullif(current_setting('app.settings.cron_secret', true), ''),
    nullif(current_setting('app.cron_secret', true), '')
  );

  SELECT (regexp_match(command, 'Bearer ([A-Za-z0-9._-]+)'))[1]
    INTO v_existing_bearer
    FROM cron.job
   WHERE command ILIKE '%Authorization%'
     AND command ILIKE '%Bearer %'
   ORDER BY
     CASE
       WHEN jobname = 'service-health-monitor' THEN 0
       WHEN jobname = 'generate-monthly-fees' THEN 1
       ELSE 2
     END,
     jobid
   LIMIT 1;

  v_auth_token := coalesce(v_cron_secret, v_existing_bearer);

  IF v_url IS NOT NULL AND v_auth_token IS NOT NULL THEN
    PERFORM cron.schedule(
      'cost-aggregator-daily',
      '0 2 * * *',
      format(
        $cron$
          SELECT net.http_post(
            url := '%s/functions/v1/cost-aggregator',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer %s'
            ),
            body := jsonb_build_object('scheduled', true, 'source', 'pg_cron'),
            timeout_milliseconds := 30000
          )
        $cron$,
        v_url,
        v_auth_token
      )
    );

    RAISE NOTICE 'cost-aggregator-daily scheduled at 02:00 UTC';
  ELSE
    RAISE NOTICE 'cost-aggregator-daily not scheduled: missing URL or auth token';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'cost-aggregator-daily scheduling failed: %', SQLERRM;
END
$$;
