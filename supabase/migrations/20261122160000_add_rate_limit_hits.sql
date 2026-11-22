-- Rate limiting for the pre-check server actions (issue #118): the public
-- signup availability check (e-mail/phone enumeration), promo code validation
-- (code guessing) and the cleaner tax id check.
--
-- Fixed-window counter: one row per (key, window). The key is
-- "<action>:<hashed ip or user id>" — never a raw IP address. rate_limit_hit
-- counts the call and returns the number of hits in the current window; the
-- caller compares it with its limit (src/lib/utils/rate-limit.ts). Rows older
-- than a day are removed on every call, so the table stays tiny.
--
-- Service role only: RLS on with no policies, and no grants to anon or
-- authenticated on the table or the function.

CREATE TABLE public.rate_limit_hits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX rate_limit_hits_window_start_idx ON public.rate_limit_hits (window_start);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limit_hits FROM anon, authenticated;

CREATE FUNCTION public.rate_limit_hit(p_key text, p_window_seconds integer) RETURNS integer
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
BEGIN
  DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 day';

  INSERT INTO public.rate_limit_hits AS r (key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;

  RETURN v_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer) TO service_role;
