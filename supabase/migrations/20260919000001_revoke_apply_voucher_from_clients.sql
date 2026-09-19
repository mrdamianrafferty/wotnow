-- Revoke client access to apply_voucher (handoff finding B1, 2026-09-18).
--
-- apply_voucher is SECURITY DEFINER and was executable by `authenticated`.
-- Its own guard only lets a caller act on their own user id, but it never
-- checks `active`, `max_uses` or validity dates, and voucher_usage has no
-- unique (voucher_id, user_id) index. Voucher ids are readable by anon
-- ("Anyone can view active vouchers"), and anonymous sign-in is free, so
-- anyone could call it repeatedly to push current_uses up to max_uses and
-- lock real customers out of a partner's voucher.
--
-- The only caller is pages/api/stripe/webhook.ts, which uses the service
-- role. Verified 2026-09-19: no other call site in wotnow, findr, RiseDaisy,
-- godaisy-core or loop-lab. (growdaisy was not on the machine to check, and
-- nothing in it should call this from a client.)
--
-- proacl before: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
-- No PUBLIC entry and grantor is postgres, so the REVOKE takes effect.

REVOKE EXECUTE ON FUNCTION public.apply_voucher(uuid, uuid, numeric, numeric)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.apply_voucher(uuid,uuid,numeric,numeric)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.apply_voucher(uuid,uuid,numeric,numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'apply_voucher is still executable by a client role';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.apply_voucher(uuid,uuid,numeric,numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'apply_voucher lost service_role EXECUTE; the Stripe webhook needs it';
  END IF;
END $$;
