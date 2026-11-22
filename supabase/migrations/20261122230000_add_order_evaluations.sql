-- Customer evaluation of a delivered order: the answers to the form at
-- /evaluering/<order id>, e-mailed to the customer when their first order is
-- delivered. One row per order. The answers are one JSON object keyed by the
-- question ids in src/lib/config/evaluation.ts; form_version says which set of
-- questions was answered.
--
-- Service role only (createAdminClient): RLS on with no policies, and no
-- grants to anon or authenticated.

CREATE TABLE public.order_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  form_version text NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_evaluations_customer_id_idx ON public.order_evaluations (customer_id);

ALTER TABLE public.order_evaluations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_evaluations FROM anon, authenticated;
