-- Applied to production 2026-08-10.
--
-- _invoke_ingest posted with timeout_milliseconds := 30000, but
-- ingest-conditions runs to an INVOCATION_DEADLINE_MS of 50000. pg_net
-- abandoned the request at 30s and stored a net._http_response row with a NULL
-- status_code and empty body, so a fully successful run left no evidence and a
-- failing one left no error. Confirmed by invoking directly after fixing the
-- 401: the function ran, and the response was still lost.
--
-- The freshwater providers were unaffected only because they return 202
-- immediately and finish in the background, so 30s always sufficed. That is why
-- it never surfaced.
CREATE OR REPLACE FUNCTION public._invoke_ingest(function_name text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE
    base_url text;
    secret text;
    request_id bigint;
BEGIN
    SELECT decrypted_secret INTO base_url
        FROM vault.decrypted_secrets WHERE name = 'edge_functions_base_url';
    SELECT decrypted_secret INTO secret
        FROM vault.decrypted_secrets WHERE name = 'edge_ingest_secret';

    IF base_url IS NULL OR secret IS NULL THEN
        RAISE EXCEPTION 'Vault secrets edge_functions_base_url / edge_ingest_secret not set';
    END IF;

    SELECT net.http_post(
        url := base_url || '/' || function_name,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Ingest-Secret', secret
        ),
        body := jsonb_build_object('source', 'pg_cron'),
        -- Must exceed the slowest callee's own deadline; ingest-conditions runs
        -- to 50s. Below that, a successful run is indistinguishable from a dead
        -- one.
        timeout_milliseconds := 60000
    ) INTO request_id;

    RETURN request_id;
END;
$function$;
