-- Pre-launch waitlist. The coming-soon pages ("/" for customers, "/bli-renser"
-- for cleaners) collect an email + city so we can notify people at launch.
-- Written only by the server action via the service role; RLS with no
-- policies keeps anon/authenticated out.
CREATE TABLE public.waitlist_signups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email character varying(255) NOT NULL,
    audience text NOT NULL,
    city text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT waitlist_signups_audience_check CHECK (audience IN ('customer', 'cleaner')),
    CONSTRAINT waitlist_signups_city_check CHECK (city IN ('bergen', 'oslo')),
    CONSTRAINT waitlist_signups_email_audience_key UNIQUE (email, audience)
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
