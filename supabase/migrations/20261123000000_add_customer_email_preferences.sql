-- Which optional e-mails a customer has turned off (/dashboard/settings/emails).
-- A JSON object keyed by the e-mail kinds in src/lib/config/email-preferences.ts;
-- only `false` means anything — a missing key is "send it". Default: everything on.

ALTER TABLE public.customers
  ADD COLUMN email_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
