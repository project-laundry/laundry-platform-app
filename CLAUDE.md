# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **NooraCare**, a peer-to-peer laundry platform that connects customers with local cleaners in Norway. The first version launches in **Bergen only**; Oslo is built but not offered (`OFFERED_CITIES` in `lib/config/postal-codes.ts`). The platform offers pickup and delivery laundry services. The first version sells one-time orders only; subscriptions are built but hidden.

The application supports four user roles:

- **Customers**: Order laundry pickups — one-time orders only in the first version. Subscriptions (recurring pickups) are built but hidden behind `SUBSCRIPTIONS_OFFERED = false` in `lib/config/subscriptions.ts`: the server turns every checkout into a one-time order and the UI shows no frequency choice or subscription wording. Keep this code; it is intentionally dormant. A customer who already has a subscription still reaches `/dashboard/subscription` to cancel it
- **Cleaners**: Accept missions, pick up at the customer, wash, and deliver back
- **Drivers** (dormant): Built to pick up and deliver along a daily optimized route, but not used in the first version — cleaners pick up and deliver, only the driver role can open the driver dashboard, and no UI links to the driver pages. Keep this code; it is intentionally unused
- **Admins**: Manage operations and platform oversight

## Development Philosophy

**This is an MVP.** Always prioritize the simplest solution that works:

- Choose simple, straightforward implementations over complex architectures
- Avoid over-engineering - build what's needed now, not what might be needed later
- Prefer existing patterns and libraries over custom solutions
- Keep code readable and maintainable rather than clever
- **Clean up unused code**: When removing a component, function, or import, always check if it's still used elsewhere. If not, delete the file/function entirely. Don't leave dead code in the codebase.
- **Testing**: The project uses Vitest. Add unit or integration tests whenever you judge them necessary — especially for business logic, payment/webhook flows, and server actions (follow the existing patterns in `*.test.ts` files). Don't add tests for trivial changes or where setup cost outweighs the value (e.g. presentational components, given there's no component-test infra).

## Technology Stack

- **Framework**: Next.js 16 with TypeScript and App Router
- **UI**: Tailwind CSS v4
- **Runtime**: React 19.2
- **Path Aliases**: `@/*` maps to `./src/*`
- **Language**: Norwegian (locale `no`)

## Development Status

**This project is currently in the development phase.**

Key implications:
- Database changes can be made without complex migrations
- No need to backfill or preserve legacy data structures
- Breaking changes are acceptable if they improve the architecture
- Focus on clean, maintainable code over backward compatibility

## Backend & Database

- **Database**: Supabase (PostgreSQL)
- **Migrations**:
  - Always create migration files in `supabase/migrations/` instead of applying changes directly via Supabase MCP
  - Use format `YYYYMMDDHHMMSS_description.sql`
  - **IMPORTANT**: Claude must never apply migrations itself (no `supabase db push`, no Supabase MCP `execute_sql`/`apply_migration`) — only create the migration file and inform the user
  - **CI applies migrations automatically on push** — `.github/workflows/staging.yaml` runs `supabase db push` against the staging project on every push to `develop`, and `.github/workflows/production.yaml` does the same against production on every push to `main`. So once a migration file is committed and pushed, it lands on the corresponding database without any manual `db push` — see `ENVIRONMENTS.md` for the full promotion flow. This means the migration ships as soon as the branch is pushed, not only once someone runs it by hand.
- **Auth e-mails**: Supabase Auth sends through Resend (custom SMTP, `NooraCare <no-reply@nooracare.no>`). The Norwegian templates in `supabase/templates/` are the source of truth, wired into `supabase/config.toml` for local `supabase start`; the hosted projects are configured by hand — after any template/subject change, paste it into **both** dashboards. Links are token links (`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…&redirect_to={{ .RedirectTo }}`, verified by `app/auth/callback` with `verifyOtp`) so they work on any device — never `{{ .ConfirmationURL }}`, which only works in the browser that started the flow. Site URL, redirect allowlist, rate limit and leaked-password protection per project: `ENVIRONMENTS.md` → "Supabase Auth e-mails". No `supabase config push` anywhere
- **Schema Documentation**:
  - See `ENTITIES.md` for complete database schema, entity definitions, relationships, and data integrity rules
  - See `BUSINESS_LOGIC.md` for application workflows, operational rules, and business process definitions
  - See `DASHBOARDS.md` for role-based UI specifications (Admin, Cleaner, Customer dashboards)
  - See `ENVIRONMENTS.md` for staging/production setup, branch→environment mapping, and the env var matrix
  - See `EMAILS.md` for every e-mail the app sends (overview tables, triggers, idempotency keys, crons) and how to add one
- **Design System**:
  - See `BRANDBOOK.md` for the visual design system (colors, typography, component recipes). All UI must follow it — copy its recipes instead of inventing new styles

## Development Commands

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm test           # Run unit/integration tests (Vitest)
npm run test:watch # Run tests in watch mode
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Customer landing page (launched): photo hero with one «Bestill henting» button (→ /orders/wash; signed-out visitors are sent to signup first and back afterwards), the illustrated how-it-works story, the price tiles and the closing «Bestill henting» block. No testimonials until there are real ones
│   ├── opengraph-image.tsx # Social share image for /, rendered by lib/og-image.tsx (bli-renser has its own)
│   ├── not-found.tsx       # Root 404 (unmatched URLs + every notFound() call)
│   ├── robots.ts           # /robots.txt (rendered per request from the Host header): nooracare.no allows the public pages and disallows /admin, /dashboard, /orders, /auth, /api, /ingest and the onboarding steps; every other host (staging, previews, localhost) answers Disallow: /
│   ├── sitemap.ts          # /sitemap.xml: the public marketing and legal pages (SITEMAP_PATHS in lib/config/site.ts) on the canonical host
│   ├── admin/              # Admin dashboard (layout = shell + role guard; page = overview: count tiles + attention sections «I dag» / «Forsinket» / «Venter på tildeling» / «Betalinger å følge opp» / «Ordre ikke generert» from lib/database/admin-attention.ts; a failed query shows an error, never 0 or an empty list)
│   │   ├── orders/         # Order list + per-order detail page (edit details, cleaner (re)assignment, «Belast på nytt» retry of a failed Vipps charge, price override while nothing is charged, «Marker som hentet/klar/levert» fallbacks, pre-pickup cancel with a customer-visible reason, internal admin_notes)
│   │   ├── cleaners/       # Cleaner list (links only) + per-cleaner detail page [cleanerId] with all onboarding data (tax id/bank account behind RevealField), orders + payout sums, and the actions: approve, reject with reason (CleanerRejectControl → rejectCleanerAction), deactivate/reactivate (verification_status), pause/resume new orders (is_accepting_orders)
│   │   ├── customers/      # Customer list + per-customer detail
│   │   ├── payments/       # Payment list (read-only)
│   │   ├── evaluations/    # Customer evaluations (read-only): averages per numeric question + every answer set, newest first
│   │   ├── promo-codes/    # Promo code list, create/edit, redemptions per code
│   │   ├── drivers/        # Driver list, create/edit (account + profile) — dormant, not in AdminNav
│   │   ├── admins/         # Admin user list (deactivated ones marked), create/edit, deactivate/reactivate another admin (AdminActiveButton → setAdminActiveAction)
│   │   └── view-as/        # «Se som kunde/renser»: ViewAsButton (on the customer and cleaner detail pages) + startViewAsAction / stopViewAsAction (set/clear the nc_view_as cookie)
│   ├── api/                # API routes
│   │   ├── cron/
│   │   │   ├── admin-digest/ # Daily admin digest (Vercel cron in vercel.json, 06:00 UTC, Production only): CRON_SECRET bearer check → getAdminAttention → buildAdminDigest → sendEmail (lib/email/send.ts), plain text to every admin user
│   │   │   └── pickup-reminders/ # Daily pickup reminder (Vercel cron in vercel.json, 16:00 UTC, Production only): CRON_SECRET bearer check → getOrdersForPickupReminder(tomorrowInOslo()) → sendPickupReminderEmail per order, one at a time → { date, sent, failed } (502 when any send failed)
│   │   └── webhooks/
│   │       └── vipps/
│   │           └── recurring/ # Vipps Recurring API webhooks (agreement activation, charge events)
│   ├── auth/               # Authentication flow
│   │   ├── address/        # Address input step
│   │   ├── callback/       # Supabase e-mail link landing: `?token_hash=&type=&redirect_to=` (verifyOtp — what the templates send; the return path is the `next` inside `redirect_to`) or legacy PKCE `?code=` (exchangeCodeForSession); sanitizes ?next=; recovery links (type=recovery or next=/auth/reset-password) always go to reset-password, failures to forgot-password?expired=1
│   │   ├── error/          # Invalid/expired confirmation link (callback redirects here for non-recovery links, keeping ?next= for the login button)
│   │   ├── forgot-password/ # Password reset step 1: e-mail → resetPasswordForEmail (redirectTo = callback?next=/auth/reset-password); always shows "sent"; ?expired=1 shows the expired-link note
│   │   ├── login/          # Login page (honors ?next= for same-site paths — signed-out visitors to the order flow are sent to signup/login by proxy.ts and returned through it); "Glemt passord?" → forgot-password; sign-in and resend errors are mapped to Norwegian by lib/auth/login-errors.ts, never shown raw
│   │   ├── reset-password/ # Password reset step 2: server page requires a session (else → forgot-password?expired=1), ResetPasswordForm calls updateUser({ password }) then → /dashboard
│   │   ├── signup/         # Sign up page (passes ?next= through to the confirmation callback and to auth/success)
│   │   └── success/        # Registration success («sjekk e-posten»; its login/retry links keep ?next=)
│   ├── bli-renser/         # Cleaner landing page (page.tsx, «Registrer deg» → signup) + onboarding flow below. faq.ts = the cleaner FAQ
│   │   ├── signup/         # Account creation (+ signup/success: "check your email")
│   │   ├── (steps)/        # Route group: server layout = cleaner-only + no-profile guard; StepGuard = step order
│   │   │   ├── business/   # Step 1: business type, tax id (uniqueness pre-check), bank account
│   │   │   ├── services/   # Step 2: base address (where the cleaner washes)
│   │   │   ├── equipment/  # Step 3: washing machine (stored on cleaners.machine_*); optional photo → recognizeMachineAction pre-fills the fields (resize-image.ts is the browser-side JPEG downscale)
│   │   │   ├── profile/    # Step 4: display name + experience + pickup weekdays (default Mon–Fri; is_accepting_orders is not asked)
│   │   │   └── confirm/    # Step 5: summary + consent → createCleanerProfileAction
│   │   └── success/        # Application submitted
│   ├── dashboard/          # User dashboards (page.tsx = customer dashboard; header gear icon → settings/)
│   │   ├── settings/       # Customer "Min konto": name + phone (users row via updateUserContact), password (browser supabase.auth.updateUser, links to /auth/forgot-password), subscription pickup address + instructions (rewrites order_defaults.initial_address, same city only, optionally copied onto the not-yet-picked-up order); emails/ = which e-mails the customer gets (switch per kind from lib/config/email-preferences.ts, five locked; signed-out visitors go through login with ?next= and come back)
│   │   ├── subscription/   # Subscription details + cancel flow — dormant while SUBSCRIPTIONS_OFFERED is false (redirects to /dashboard unless the customer already has a subscription)
│   │   ├── cleaner/        # Cleaner dashboard: page.tsx = active orders grouped by next step (Dagens runde / Kommende hentinger / Vaskes) + one income row — «Dagens runde» is one trip of pickups due today (+ overdue) AND every ready-to-deliver order, each marked Hent/Lever, ordered as the shortest round trip from the cleaner's base (`optimizeRoundTrip` in `lib/utils/route.ts`, straight-line) and «Åpne ruten» opens it in Google Maps (`buildRoundTripUrl`); [orderId]/ = the order journey, one step card at a time (OrderStep: pickup → wash count + price → deliver; the wash confirm saves the details and marks ready in one go); earnings/ = monthly payout, finished orders, VAT limit; settings/ = profile + availability (is_accepting_orders + weekly_schedule), then «Konto»: contact info (name + phone, e-mail read-only) and password — the customer page's ContactForm / PasswordForm from dashboard/settings/, password form hidden in «Se som»
│   │   └── driver/         # Driver dashboard (daily route) — dormant, driver role only
│   ├── evaluering/[orderId]/ # Customer evaluation form (public, no login — the order UUID in the link in the delivered e-mail is the key): the full 12-question form until the customer has answered the first-time questions once, then the 5-question short form — decided server-side by `needsFullEvaluation`, never by the client; questions from lib/config/evaluation.ts, completed orders only, one answer set per order (submitEvaluationAction, rate limited per IP) → order_evaluations
│   └── orders/             # Customer order flow (3 steps; requires an account from step 1 — proxy.ts redirects signed-out page loads under /orders via orderAuthRedirect in lib/auth/next-path.ts: the three steps → /auth/signup?next=, other order pages → /auth/login?next=)
│       ├── [orderId]/      # Order cancel/reschedule
│       ├── details/        # Customer order details
│       ├── wash/           # Step 1: what to wash (bags, bedding, ironing)
│       ├── pickup/         # Step 2: address + pickup date (the frequency section is hidden while SUBSCRIPTIONS_OFFERED is false)
│       ├── confirm/        # Step 3: review + promo code + required terms/angrerett consent + Vipps handoff
│       ├── success/        # Order success (polls getCheckoutStatusAction: DB agreement status + first-order presence; Vipps only as abort fallback while pending)
│       ├── layout.tsx      # Step route guards (redirects to /orders/wash)
│       └── actions.ts      # Server actions
├── assets/brand/          # Logo PNGs (primary/secondary/submerke, normal + negativ); favicons are app/icon.png + app/apple-icon.png
├── components/             # Reusable UI components
│   ├── auth/               # Auth components (empty)
│   ├── analytics/          # TrackSectionView — invisible IntersectionObserver marker that fires one analytics event when scrolled into view (used by HowItWorksStory); ConsentBanner (the cookie banner, mounted in the root layout, also starts/stops session replay per page) and ConsentSettingsButton (re-opens it from the privacy pages)
│   ├── coming-soon/        # Shell of the customer landing page (light hero with optional photo and an `action` slot for the «Bestill henting» button, CrossPromo); HowItWorksStory.tsx = the illustrated 5-step story. The folder name is historical — nothing is coming-soon any more
│   ├── landing/            # Navbar (legal/contact/price pages), Footer, AccountLink (client: «Logg inn» → /auth/login, or «Min side» → /dashboard once the browser finds a Supabase session; used by the customer landing shell, Navbar and the bli-renser bar — the pages stay static, nobody is redirected)
│   ├── forms/              # Form components (empty)
│   ├── layout/             # Layout components (empty)
│   ├── legal/              # CompanyContactCard — the company details box shared by /salgsvilkar, /personvern and /personvern-renser (values from lib/config/company.ts)
│   └── ui/                 # UI elements
│       ├── LogoutButton.tsx
│       ├── NavigationProgress.tsx # Top progress bar on every App Router navigation (mounted in the root layout); set from onRouterTransitionStart via lib/navigation/progress.ts, resets by itself when the navigation is done
│       └── LinkPendingIcon.tsx    # Wraps a <Link>'s icon: spinner in its place while that link's page loads (useLinkStatus). See BRANDBOOK.md §5
├── hooks/                  # Custom React hooks (empty)
├── lib/                    # Core utilities and business logic
│   ├── analytics/          # PostHog, cookieless: config.ts = host allowlist (nooracare.no, www, test), autocapture URL ignorelist, session replay blocklist, the AnalyticsEvent union (pure, tested); posthog.ts = initAnalytics() + track() + consent (acceptAnalytics / declineAnalytics / analyticsConsent / syncRecording) — the only file that imports posthog-js
│   ├── ai/                 # Claude integration: machine-recognition.ts (photo → machine suggestion, never throws), config.ts (ANTHROPIC_API_KEY)
│   ├── auth/               # requireRole/assertRole guards (require-role.ts); signup error mapping (signup-errors.ts); password-reset paths + error mapping (password-reset.ts); login error mapping (login-errors.ts); ?next= sanitizing (next-path.ts); the admin «Se som» view (view-as.ts: getViewer / requireViewer / getViewerCustomer — see Middleware)
│   ├── config/
│   │   ├── company.ts      # COMPANY (legal name, org number, postal address, phone, e-mail, Instagram/Facebook URLs) + formatOrgNumber/phoneHref/formatPostalAddress — the ONLY place these values live; footer, /kontakt, the legal pages and bli-renser/success read from it. Confirm the values before launch
│   │   ├── postal-codes.ts # POSTAL_CODE_RANGES (Bergen, Oslo) + OFFERED_CITIES (['Bergen'] in the first version) — the one switch for where we operate: getCityFromPostalCode answers null for a city that is not offered, so Oslo postal codes are "outside the service area" in the order flow, address edits, cleaner onboarding and settings; serviceAreaText('og' | 'eller') renders every "vi er i …" sentence (landing badge, footer, FAQ, error messages, /salgsvilkar, share image). To open Oslo, add it to OFFERED_CITIES and bump TERMS_VERSION — keep the Oslo code, it is intentionally dormant
│   │   ├── email-preferences.ts # CUSTOMER_EMAIL_KINDS (ten kinds, five optional: cleaner_confirmed, pickup_reminder, picked_up, delivered, evaluation), wantsEmail(preferences, kind), cleanEmailPreferences, EMAIL_PREFERENCES_PATH. Add a new customer e-mail here
│   │   ├── evaluation.ts   # The evaluation form: EVALUATION_QUESTIONS (id, type scale/choice/price/text, Norwegian texts, `firstTimeOnly` on the seven first-time questions), evaluationQuestions(full) (all or the five short-form questions), EVALUATION_FORM_VERSION (bump when a question changes; never reuse an id), validateEvaluationAnswers(input, questions), hasAnsweredFirstTimeQuestions, formatEvaluationAnswer, averageEvaluationAnswer
│   │   ├── order-timing.ts # ORDER_TIMING: `minimum_days_notice` (0 = same-day pickup, 1 = the day before, 2 = two days before …), `same_day_cutoff` ('15:00' Norwegian time = when the pickup window opens; only used with 0 days) and the pickup→delivery days. earliestPickupDate(now) is the ONE rule for the first bookable pickup date — used by the date chips in the order flow, the reschedule calendar, validateCheckoutInput and updateOrderPickupDateAction; pickupNoticeText() renders the rule in /salgsvilkar section 7. The same file holds the customer's self-service deadlines, both whole days in the Norwegian calendar: `canCancelOrderSelf` (cancel until midnight at the start of the day before the pickup day — used by `cancelOrderAction` and `CancelOrderButton`) and `canReschedulePickupSelf` (move the date until midnight at the start of the pickup day — used by `updateOrderPickupDateAction`, `RescheduleButton` and the reschedule page), plus their Norwegian texts. Admins are not bound by either
│   │   ├── pricing.ts      # Pricing constants and both calculators: calculateOrderPrice (cleaner-binding: per 5kg load + 3 ironing groups) and calculateCustomerEstimate (customer estimate: per bag/set/piece). One bag = one bedding set = one wash = 299 kr (`per_bag_ore`, `per_bedding_set_ore`, `price_per_load_ore` are kept equal on purpose so the customer's estimate and the cleaner's final price agree — change them together). Ironing groups exist in the model but are NOT offered in the first version — hidden on every public surface, see BUSINESS_LOGIC.md "Ironing". CLEANER_MIN_PAYOUT_PER_ORDER_ORE is the "minst 350 kr per oppdrag" cleaner marketing leads with (70 % of the 500 kr order minimum). PRICE_REVIEW_ESTIMATE_FACTOR (2) + isPriceFarAboveEstimate / orderPriceNeedsReview / isChargeHeldForPriceReview are the price guard — see Price Guard
│   │   ├── subscriptions.ts # SUBSCRIPTIONS_OFFERED (false in the first version) — the one switch that hides recurring pickups: order flow, dashboard empty state, Min konto, /salgsvilkar section 7 (which then shows the one-time change/cancellation rules instead), /personvern, admin customer card; createSubscriptionAction forces 'on_demand' while it is false. See BUSINESS_LOGIC.md "Subscriptions (not in the first version)"
│   │   ├── site.ts         # SITE_URL (`https://nooracare.no`, a constant — never NEXT_PUBLIC_APP_URL), isIndexableHost, SITEMAP_PATHS and ROBOTS_DISALLOW for app/robots.ts and app/sitemap.ts. Add a new public page to SITEMAP_PATHS
│   │   └── terms.ts        # TERMS_VERSION (ISO date of the current /salgsvilkar text, bump on every terms change) + formatTermsVersion; stamped into payment_agreements.provider_metadata.terms_consent at checkout
│   ├── database/           # Database CRUD operations
│   │   ├── admin-attention.ts  # Today/overdue/waiting/failed lists for /admin and the digest; every list is `T[] | null` (null = query failed). Rules: overdue pickup = scheduled_date < today (Oslo) and not picked up; ready too long = ready_for_delivery_at older than READY_TOO_LONG_DAYS; payments = failed + orphan pending + stale pending (STALE_PENDING_DAYS, lib/utils/payment-status.ts) + cancelled charges whose order is still unpaid (price above 0, no live payment, the cancelled row is the newest); `ordersNotCharged` = orders in ready_for_delivery/out_for_delivery/completed with a price above 0 and no payment row at all, shown first in «Betalinger å følge opp» — «Holdt tilbake» when `isChargeHeldForPriceReview` (lib/config/pricing.ts) says the price guard held the charge, else «Ikke belastet»; "order not generated" = active subscription/agreement older than ACTIVATION_GRACE_MINUTES with no (active) order. delivery_date is never used for lateness
│   │   ├── cleaners.ts     # Cleaner queries & matching
│   │   ├── evaluations.ts  # order_evaluations (one row per order, answers JSONB): getOrderForEvaluation, hasEvaluation, createEvaluation ('created' | 'duplicate' | 'error'), needsFullEvaluation (full form until the customer has answered the first-time questions once; false when the read fails), getAllEvaluations
│   │   ├── customers.ts    # Customer queries
│   │   ├── orders.ts       # Order CRUD
│   │   ├── payment-agreements.ts  # Payment agreement CRUD (Vipps agreement lifecycle)
│   │   ├── payments.ts     # Payment operations (includes Vipps metadata management)
│   │   ├── promo-codes.ts  # Promo code validation & redemption (shared, once-per-customer)
│   │   └── subscriptions.ts   # Subscription operations (recurring order management)
│   ├── email/
│   │   ├── admin-mail.ts   # sendToAdmins({ subject, text, idempotencyKey? }) → { recipients, sent }: one message PER admin (`users.role = 'admin'`, not deleted), key suffixed with the admin's user id — a bouncing admin address must never suppress the others' copy. Used by the digest, the staff order alerts and the error alerts
│   │   ├── send.ts         # sendEmail(): the ONE Resend transport (fetch → POST /emails, optional Idempotency-Key, never throws, { ok } | { ok: false, error }); CUSTOMER_EMAIL_FROM. Used by the admin digest and the customer e-mails. Never sends to an invented test address (`isUndeliverableTestAddress`: example.com/.org/.net, test.no, the TLDs .test/.example/.invalid/.localhost) — those return `{ ok: true, skipped: true }`, a success for every caller
│   │   ├── customer-emails.ts # Pure builders for the customer e-mails → { subject, text, html }: buildOrderConfirmationEmail (#23), buildPriceReceiptEmail (#26), buildPaymentFailedEmail (#28), buildOrderDeliveredEmail (#27), buildOrderPickedUpEmail (#25), buildPickupReminderEmail (#24), buildOrderCancelledEmail + buildPickupRescheduledEmail (#29), buildCleanerConfirmedEmail (#30). Text and HTML rendered from one block list; HTML wrapper mirrors supabase/templates/
│   │   └── staff-emails.ts # Pure builders for the staff e-mails: buildCleanerNewOrderEmail («Nytt oppdrag», { subject, text, html } with the customer-emails block list and HTML wrapper), buildCleanerPickupRescheduledEmail («Ny hentedato») and buildCleanerOrderMovedEmail («Oppdraget er flyttet») in the same format, buildAdminNewOrderEmail, buildAdminOrderUnassignedEmail and buildAdminNewCleanerEmail (plain text { subject, text })
│   ├── payments/           # Payment processing integrations
│   │   └── vipps/          # Vipps integration (Recurring API)
│   │       ├── base-client.ts      # Shared OAuth and HTTP utilities
│   │       ├── recurring-client.ts # Recurring API client (agreements, charges)
│   │       ├── webhook-auth.ts     # Shared webhook HMAC-SHA256 verification
│   │       ├── service.ts          # High-level Vipps service layer
│   │       └── config.ts           # Vipps configuration validation
│   ├── services/
│   │   ├── admin-digest.ts      # buildAdminDigest(attention, { appUrl, now }) → { subject, text } (pure, plain text)
│   │   ├── customer-emails.ts   # sendOrderConfirmationEmail / sendPriceReceiptEmail / sendPaymentFailedEmail / sendOrderDeliveredEmail / sendOrderPickedUpEmail / sendOrderCancelledEmail / sendPickupRescheduledEmail / sendCleanerConfirmedEmail — load (getOrderForCustomerEmail, getPaymentById, getPaymentsByOrderId), build, send; NEVER throw, return void (callers: Vipps webhook, ready-order, retryChargeAction, complete-order, markOrderPickedUpAction, adminMarkPickedUpAction, cancelOrderAction, updateOrderPickupDateAction, cancelOrderAdminAction, updateOrderDetailsAction, assignCleanerAction); sendPickupReminderEmail(order) → boolean for the pickup-reminders cron (#24)
│   │   ├── error-alerts.ts      # reportError(source, error, details?) — logs and e-mails an unexpected error to every admin, at most once per hour per error; NEVER throws. See Error Alerts
│   │   ├── order-generation.ts  # Subscription to orders logic
│   │   ├── staff-emails.ts      # sendCleanerNewOrderEmail(orderId) / sendAdminNewOrderEmail(orderId) / sendAdminOrderUnassignedEmail(orderId, declinedByName) — load (getOrderForStaffEmail, getUsersByRole), build, send; NEVER throw, return void (callers: Vipps webhook, assignCleanerAction, declineCleanerOrder); sendCleanerPickupRescheduledEmails(orderId, before) after a pickup date change (callers: updateOrderPickupDateAction, updateOrderDetailsAction); sendAdminNewCleanerEmail(cleanerId) — «Ny renser venter på godkjenning» to every admin (caller: createCleanerProfileAction). See `EMAILS.md`
│   │   └── staff-accounts.ts    # Staff (driver/admin) account creation: auth user + role flip + cleanup; setStaffAccountActive(userId, active) = Supabase Auth ban + users.deleted_at
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   ├── server.ts       # Server Supabase client
│   │   └── index.ts        # Exports
│   ├── utils/
│   │   ├── rate-limit.ts   # isRateLimited(action, subject, limit?) — fixed-window counter in Postgres (`rate_limit_hit`, table `rate_limit_hits`), subject hashed, FAILS OPEN; used by checkSignupAvailabilityAction (per IP), validatePromoCodeAction and checkTaxIdAvailabilityAction (per account), 10 calls / 10 min
│   │   ├── date.ts         # Date/weekday utilities; todayInOslo / tomorrowInOslo for "the customer's day" (the server runs in UTC)
│   │   ├── email.ts        # isValidEmail (loose e-mail shape check)
│   │   └── order-number.ts # Order number generation
│   ├── og-image.tsx        # Shared next/og renderer for the social share images (Fjord + stacked logo; Fraunces fetched at build, falls back silently)
├── types/
│   ├── database.ts         # Complete entity types and enums
│   └── index.ts            # General type exports
├── instrumentation.ts      # onRequestError → reportError: every unhandled server error is e-mailed to the admins (production builds only)
├── instrumentation-client.ts # Browser entry (Next convention): initAnalytics({ key: NEXT_PUBLIC_POSTHOG_KEY, hostname }); onRouterTransitionStart → notifyNavigationStart (the top progress bar)
└── proxy.ts                # Trailing-slash redirect + Supabase session refresh + order-flow login requirement; matcher skips /ingest (PostHog proxy), /robots.txt and /sitemap.xml
```

**Customer-facing wording:** customers count **poser** (`PRICING.per_bag_ore`), and the per-bag price is never shown without the order minimum next to it ("299 kr per pose, minste bestilling 500 kr") — on its own it reads as a 119 kr order. Cleaners count **vask** — one full machine, up to 5 kg (`PRICING.price_per_load_ore`); mention the kilos only where a cleaner needs the definition (FAQ, payout box, dashboard), never on customer surfaces. Cleaner earnings are quoted as the guaranteed minimum per order (`CLEANER_MIN_PAYOUT_PER_ORDER_ORE`), not a per-load figure. "Nabo" is a sales pitch, not a description: fine in headlines, tab titles, share images and cross-promos, but whoever actually washes is "en lokal renser" / "en godkjent renser i området" — never "i nabolaget". Don't promise turnaround times, free delivery, ironing or a quality guarantee anywhere — see the honest-claims note in `components/coming-soon/HowItWorksStory.tsx`.

## Architecture Patterns

### Server Actions

Server actions handle mutations from the UI:

- `app/orders/actions.ts` - Subscription creation, Vipps agreement creation, customer queries; `cancelOrderAction` and `updateOrderPickupDateAction` e-mail the customer after the write (see `EMAILS.md`); `cancelOrderAction` refuses once `canCancelOrderSelf` is false; `updateOrderPickupDateAction` refuses from the pickup day on (`canReschedulePickupSelf`) and for a new date more than `MAX_DAYS_AHEAD` days ahead, and e-mails the cleaner side after the write (see `EMAILS.md`); `cancelOrderAction` also stops a one-time order's Vipps agreement right after the cancel write (`stopVippsAgreementForOneTimeOrder`, see One-Time Agreement Stop)
- `app/auth/actions.ts` - Public signup pre-check (`checkSignupAvailabilityAction`): both signup forms call it before `supabase.auth.signUp` because Supabase Auth hides which constraint failed inside `handle_new_user`; the `signUp` result is then mapped by `lib/auth/signup-errors.ts`
- `app/bli-renser/actions.ts` - Cleaner profile creation (`createCleanerProfileAction`, which e-mails every admin «Ny renser venter på godkjenning» after the insert — see `EMAILS.md`) and the step-1 tax id pre-check (`checkTaxIdAvailabilityAction`): `cleaners.tax_id` is UNIQUE, so the business form checks it before advancing instead of letting the final insert fail on step 5; the action also maps a `23505` from the insert to the same message as a race fallback; and the step-3 photo helper (`recognizeMachineAction`): guards with `assertRole(["cleaner"])`, validates the base64 payload, and returns `lib/ai/machine-recognition.ts`'s `{ status: 'ok' | 'no_machine' | 'unavailable' }` result for the form to pre-fill from. Bank account, fødselsnummer and organisasjonsnummer are checksum-validated (MOD11) by `bankAccountError` / `taxIdError` in `lib/validation/cleaner.ts` — the same functions the business step, the cleaner settings form and `updateCleanerSettingsAction` use (settings checks the account number only when it changes)
- `app/dashboard/settings/actions.ts` - Customer account page: `updateContactAction` (name/phone → `updateUserContact`, phone stored as `+47` + 8 digits; allowed for customers and cleaners — the cleaner settings page uses it too) and `updateSubscriptionAddressAction` (rewrites `order_defaults.initial_address` on the active subscription — city derived from the postal code must equal `location_city`; validated via `validateAddress`, coordinates replaced; optional copy onto `pending_assignment`/`pickup_scheduled` orders via `updateUpcomingOrdersAddressBySubscriptionId`). Password change is client-side (`supabase.auth.updateUser`), no action; `updateEmailPreferencesAction` (`customers.email_preferences`)
- `app/admin/orders/actions.ts` - Cleaner (re)assignment (every assignment e-mails the newly assigned cleaner «Nytt oppdrag», see `EMAILS.md`; assigning a `pending_assignment` order also sends the customer the "cleaner confirmed" e-mail, see `EMAILS.md`), admin order edits (dates, address — a changed pickup date e-mails the customer and sends the order's cleaner «Ny hentedato»), `retryChargeAction` (re-creates the Vipps charge for an order with no live payment — gated by `hasLivePayment` in `lib/utils/payment-status.ts`), `cancelOrderAdminAction` (pre-pickup only, reason required → `cancellation_reason`, shown in the customer's cancellation e-mail, no 24 h rule, rolling window regenerates for an active subscription, a one-time order's Vipps agreement is stopped right after the cancel write), `overrideOrderPriceAction` (`in_cleaning`/`ready_for_delivery`, or `completed` with a price above 0, and no live payment — saving a price never charges, the admin presses «Belast på nytt» afterwards; same formula as the cleaner via `calculateOrderPrice` + `applyPromoDiscount`, writes `updateOrderPricingByAdmin`), `adminMarkReadyAction` (exit for an order stuck in `in_cleaning` — shares `lib/services/ready-order.ts` with the cleaner's «Marker som klar», so it charges the customer), `updateAdminNotesAction` (`orders.admin_notes`, any status)
- `app/dashboard/cleaner/actions.ts` - The cleaner's order steps (picked up, save wash details, ready + charge — or ready with the charge held, see Price Guard — delivered) and `declineCleanerOrder`: guarded `declineOrder`, then automatic re-assignment — `findAvailableCleaner` minus `declined_by_cleaner_ids` → `assignCleanerToPendingOrder` (guarded) → «Nytt oppdrag» to the new cleaner; nobody available or pickup date already past → the order stays `pending_assignment` and every admin gets «Ordre venter på tildeling». The customer gets nothing either way (see `EMAILS.md`)
- `app/admin/cleaners|drivers|admins|promo-codes/actions.ts` - Admin dashboard mutations (cleaner approve/deactivate + `rejectCleanerAction` with a required reason, staff account create/edit, promo code create/edit)

**Note:** Vipps agreement creation uses server actions (not API routes) for consistency with the codebase pattern. API routes are only used where external services need to call in (webhooks, callbacks, cron).

### Database Access

All database operations use dedicated functions in `lib/database/`:

- Always use server-side Supabase client (`lib/supabase/server.ts`)
- Each entity has its own file with CRUD operations
- Type-safe with interfaces from `types/database.ts`

### Types

`src/types/database.ts` contains all entity types and enums:

- **Enums**: UserRole, OrderStatus, PaymentStatus, SubscriptionStatus, PaymentAgreementStatus, etc.
- **Entities**: User, Customer, Cleaner, PaymentAgreement, Order, Subscription, Payment, etc.

### Middleware

`src/proxy.ts` (Next 16 proxy convention) refreshes Supabase auth sessions on every request. On every host, a signed-out page load under `/orders/*` is redirected to signup/login with `?next=` (`orderAuthRedirect`). There is no pre-launch gate any more: both the customer and the cleaner side are public on `nooracare.no`. The matcher skips `/ingest`, the PostHog reverse proxy (`next.config.ts` rewrites to `eu.i.posthog.com`), so analytics requests cost no Supabase call. Because `skipTrailingSlashRedirect` is on for that proxy, the first thing `proxy.ts` does is 308 `/foo/` → `/foo` for app paths, so canonical URLs are unchanged. Role guards live in `src/lib/auth/require-role.ts` (`requireRole` for pages/layouts, `assertRole` for server actions); privileged roles (`admin`, `driver`) can never be chosen at signup — the `handle_new_user` trigger only honors `customer`/`cleaner` metadata. A deactivated administrator (`users.deleted_at` set from `/admin/admins`) is treated as signed out by both guards. **«Se som» (admin view-as):** from a customer's or cleaner's admin page an admin can open that person's pages read-only. `startViewAsAction` sets the httpOnly cookie `nc_view_as` (target user id, 1 hour); `getViewer()` in `src/lib/auth/view-as.ts` honours it only when the real session is an active admin and the target is a customer or cleaner. Every server page under `/dashboard` and the customer order pages (`/orders/details/[orderId]`, `/orders/[orderId]/reschedule|cancel`) resolve the user with `getViewer` / `requireViewer` / `getViewerCustomer` — a new customer or cleaner page must do the same and never call `supabase.auth.getUser()` itself. Server actions must NOT use the viewer: they stay on `assertRole` / the real session, which is what makes the view read-only. `ViewAsBanner` (dashboard layout + the three order pages) shows whose view it is and ends it. Browser-side writes need hiding by hand in view mode (the password form on `/dashboard/settings` is).

## Maps & Geocoding

Addresses are geocoded into `latitude`/`longitude` so the (dormant) driver dashboard can build an optimized route and the cleaner gets a map link.

- **Service**: `lib/maps/geocoding.ts` (`geocodeAddress` → `{ latitude, longitude } | null`, never throws) and `lib/maps/config.ts` (`GOOGLE_MAPS_API_KEY`).
- **Geocode at the source, propagate by copy**: addresses are geocoded once where they enter the system — checkout and address edit (`app/orders/actions.ts`) and cleaner onboarding (`app/bli-renser/actions.ts`). Customer coords are stored in `subscriptions.order_defaults.initial_address` and copied onto every generated order by `lib/services/order-generation.ts`. Cleaner coords live on the `cleaners` row.
- **Graceful degradation**: geocoding failures return `null`; the address still saves with `latitude`/`longitude` as `NULL`. `saveOrderCoords` / `saveCleanerCoords` exist for lazily backfilling rows that are missing coordinates.
- **Env**: `GOOGLE_MAPS_API_KEY` (enable the **Geocoding API**; Routes API will be added for route optimization).

## Machine Photo Recognition

Cleaner onboarding step 3 can pre-fill the washing machine fields from a photo. The photo is never stored.

- **Service**: `lib/ai/machine-recognition.ts` (`recognizeWashingMachine` → `{ status: 'ok', suggestion } | { status: 'no_machine' } | { status: 'unavailable' }`, never throws) and `lib/ai/config.ts` (`ANTHROPIC_API_KEY`). Uses `@anthropic-ai/sdk` `messages.parse` with a zod 4 schema via `zodOutputFormat`, model `claude-opus-5`, `output_config.effort: 'medium'`.
- **Client-side resize is mandatory**: `app/bli-renser/(steps)/equipment/resize-image.ts` downscales the picked file to a ≤1024 px JPEG before calling `recognizeMachineAction`. Server actions reject bodies over 1 MB, and the Claude API doesn't accept HEIC — do not raise `bodySizeLimit` instead.
- **Suggestions overwrite, nulls don't**: each of the four fields (brand/model, capacity, year, condition) is independently nullable; non-null values replace what's typed, null leaves it. The cleaner edits freely afterwards; the store is only written on submit as before.
- **Graceful degradation**: missing key, API error, refusal, unparsable output → `unavailable`; a photo without a washing machine → `no_machine`. Both show a short message; the step is always completable manually.
- **Env**: `ANTHROPIC_API_KEY` (optional; see `ENVIRONMENTS.md`).

## Analytics

PostHog (EU cloud), **cookieless unless the visitor accepts the consent banner** (#91, #138). `cookieless_mode: 'on_reject'` + `opt_out_capturing_by_default: true`, `person_profiles: 'never'`, no `identify()`:

- **Before an answer and after «Avvis»** — cookieless: no cookies, no local/session storage except PostHog's remembered answer (`__ph_opt_in_out_<key>` in localStorage after «Avvis»), anonymous id hashed on PostHog's servers and rotated daily, no session replay.
- **After «Godta»** — PostHog uses cookies and browser storage, and **session replay** runs. Everything typed is masked (`maskAllInputs`), elements marked `data-ph-mask` are masked (the address on `/orders/confirm`), and replay never records the pages in `RECORDING_URL_BLOCKLIST` (`lib/analytics/config.ts`): `/admin`, `/dashboard`, cleaner signup/onboarding, the per-order pages and `/auth/*`. `syncRecording(pathname)` starts/stops it on every navigation.
- **The banner** is `components/analytics/ConsentBanner.tsx`, mounted in `app/layout.tsx`; «Avvis» and «Godta» are styled identically on purpose (refusing must be as easy as accepting). `ConsentSettingsButton` on both privacy pages (section 6, `#informasjonskapsler`) re-opens it; a withdrawn consent deletes PostHog's cookies. It renders nothing where analytics is off. When adding a page that shows personal data as text, add it to the blocklist or mark the text `data-ph-mask`.

The SDK is initialised in `src/instrumentation-client.ts` → `lib/analytics/posthog.ts` (the only file that imports posthog-js) only when `NEXT_PUBLIC_POSTHOG_KEY` is set **and** the hostname is `nooracare.no` / `www.nooracare.no` / `test.nooracare.no` (`lib/analytics/config.ts`); localhost and previews send nothing. Events go through the same-origin proxy `/ingest` (`next.config.ts` rewrites; the www→apex redirect and `proxy.ts` both leave `/ingest` alone). Page views (incl. client-side navigation), page leaves (scroll depth), heatmaps, rageclicks and autocapture clicks are automatic; autocapture is off on `/admin`, `/dashboard`, the cleaner signup and onboarding steps and the per-order pages. `$pageview` and `$pageleave` from `/admin` and `/dashboard` are dropped in the browser (`before_send` → `isDroppedPageEvent` in `lib/analytics/config.ts`) so staff, cleaner and «Se som» sessions do not inflate the totals; every other event from there, browser errors included, is still sent. Custom events are the `AnalyticsEvent` union in `lib/analytics/config.ts` and are sent with `track()` from client components — never send e-mail, name, address, phone, user ids or form input. Landing-page CTAs carry `data-ph-capture-attribute-cta="…"` (`audience-switch` = the landing «Logg inn» pill, `my-page` = «Min side» for signed-in visitors, `price-list`, `cross-promo`) so autocapture clicks can be filtered by `cta`. The PostHog project settings **Cookieless tracking** (or cookieless events are discarded) and **Record user sessions** (or no replay) must be on (`ENVIRONMENTS.md` → "PostHog").

| Event | Fired where | Properties |
|---|---|---|
| `how_it_works_viewed` | `TrackSectionView` inside `HowItWorksStory` | — |
| `calculator_used` | `EstimateCalculator`, first selection change per mount | — |
| `order_step_completed` | wash → pickup, pickup → confirm | `step` (1 or 2); step 1: `bags`, `bedding_sets`, `estimate_ore`; step 2: `city`, `recurring`, `frequency` |
| `checkout_login_wall_shown` | confirm page when `signedIn === false` (rare: signed-out visitors are sent to signup before step 1) | — |
| `promo_code_applied` | confirm page after validation | `valid`, `code` (upper-cased), `reason` (`'error'` or `null`) |
| `checkout_vipps_started` | confirm page, after `createSubscriptionAction` succeeded, before leaving (sendBeacon) | `recurring`, `frequency`, `city`, `estimate_ore`, `promo`, `auto_accept` |
| `checkout_result` | success page `applyResult` | `status` (`'active' \| 'cancelled' \| 'pending'`), `recurring` |
| `signup_submitted` | customer signup page after the server answered | `ok`, `reason` (`'taken' \| 'error' \| null`), `from_order_flow` |
| `login_submitted` | login page after `signInWithPassword` | `ok`, `from_order_flow` |

Cookieless ids rotate daily, so funnels use a conversion window of 1 day, and the signup funnel ends at the "check your e-mail" page (the confirmation click cannot be linked).

- **Env**: `NEXT_PUBLIC_POSTHOG_KEY` (one PostHog project per environment; see `ENVIRONMENTS.md`).

## Error Alerts

Error tracking (#119) has two destinations. **PostHog error tracking** collects everything: uncaught browser errors and unhandled promise rejections (`capture_exceptions: true` in `lib/analytics/posthog.ts`) and every server error passed to `reportError` (`lib/analytics/server-errors.ts`, `posthog-node`, sent immediately as the anonymous source `server`; only where `NEXT_PUBLIC_POSTHOG_KEY` is set, i.e. production). **E-mail** is for what needs action the same day: `reportError(source, error, details?)` in `lib/services/error-alerts.ts` logs the error, sends it to PostHog and e-mails it as plain text to every admin (`users.role = 'admin'`, `deleted_at IS NULL`, sender `ADMIN_DIGEST_FROM`) through the shared `sendEmail` transport. It **never throws, returns void and must be awaited**. The same source + message is mailed at most once per hour (Resend `Idempotency-Key` `error-alert/<hash>/<YYYY-MM-DDTHH>`). The mail carries the error text, a trimmed stack and the ids the caller passes — never a request body or customer data.

- **Unhandled errors:** `src/instrumentation.ts` → `onRequestError` reports every error Next.js catches in a page render, route handler or server action (path without query string). Production builds only (staging and production; never `next dev`); `notFound()`/`redirect()` digests are skipped.
- **Swallowed failures that are reported explicitly:** the Vipps webhook's 500 path (e.g. first-order generation failed after activation), `charge-failed` and `charge-creation-failed` webhooks, a failed charge creation in `markOrderReadyAndCharge`, every failed Vipps agreement stop (`stopVippsAgreementForOneTimeOrder`, `stopVippsAgreementForCancelledSubscription`, the stop after capture), and a failed rolling-window order generation in `completeDeliveredOrder`. Two alerts are not code failures but money that will not arrive: «Vipps-avtale stoppet utenfor NooraCare – ordren kan ikke belastes» (`recurring.agreement-stopped.v1` with an actor other than `MERCHANT`, one e-mail per order that still needs payment — not cancelled, and either not priced yet or priced above 0 with nothing captured; the order is never cancelled automatically) and «Vipps-belastning kansellert – ordren er ikke betalt» (`recurring.charge-canceled.v1`, unless another live payment covers the order or the webhook is a redelivery). Both carry order id, order number, the Vipps agreement id and a `tiltak` line.
- When adding a `catch` that keeps the customer or Vipps unaffected by swallowing an error, call `await reportError(...)` there instead of only `console.error`.
- **Env:** `RESEND_API_KEY`, optional `ADMIN_DIGEST_FROM` — nothing new.

## Price Guard

The customer's checkout estimate is informational and the cleaner sets the binding price, and the Vipps agreement has no maximum amount — so `markOrderReadyAndCharge` (`lib/services/ready-order.ts`) holds the charge when the price is far above the estimate.

- **Rule** (`orderPriceNeedsReview` in `lib/config/pricing.ts`): the order has a `customer_estimate`, its total is above 0, and the full price before promo (`total_cost_ore` + `promo.discount_ore`) is more than `PRICE_REVIEW_ESTIMATE_FACTOR` (2) × `estimated_total_ore`. Exactly 2 × is charged as normal. Orders without an estimate are never held.
- **A held order** still becomes `ready_for_delivery` with price and payout stamped, but gets no `payments` row, no Vipps charge and no price e-mail. The service returns `{ success: true, chargeHeld: true }`. The same applies to the admin fallback «Marker som klar».
- **Admin e-mail:** `buildPriceReviewEmail` + `sendToAdmins`, key `price-review/<order.id>` — order number, estimate, the cleaner's price, wash count and pricing note, link to the order page, the two ways out. Never throws; when it reaches no admin, `reportError` is called.
- **Ways out, both on `/admin/orders/[orderId]`:** «Belast på nytt» (`retryChargeAction`) approves the price — it creates the charge and sends the customer the price e-mail; or the price override first (`overrideOrderPriceAction`, also allowed on a `completed` order with a price above 0 and no live payment) and then «Belast på nytt». Saving a price never charges.
- **No stored state:** `isChargeHeldForPriceReview(order, paymentRowCount)` derives it — status `ready_for_delivery`/`out_for_delivery`/`completed`, `orderPriceNeedsReview`, and zero payment rows. The first «Belast på nytt» creates a row and ends the held state. Used by the admin order page (the note above «Belast på nytt») and the cleaner's order page (the held message instead of "charge failed").
- **Delivered before review:** `stopVippsAgreementForOneTimeOrder` refuses to stop the agreement of a completed order with a price above 0 and no live payment, so a held order stays chargeable after delivery.
- **Cleaner copy:** the wash step's confirm says NooraCare reviews the price before the customer is charged (button «Bekreft», not «Bekreft og belast»); the delivery step says the same and that the payout comes at the usual time.

## E-mails

Every e-mail the app sends — customer, cleaner, admin and the Supabase Auth e-mails — is described in `EMAILS.md`: the overview tables, the exact trigger and idempotency key of each one, the pickup-reminder and digest crons, and the steps for adding a new e-mail. Read it before touching anything in `lib/email/` or `lib/services/*-emails.ts`. The rules in short:

- One transport: `sendEmail` in `lib/email/send.ts` (Resend REST via `fetch`, never throws). Sender functions never throw and return void — a lost e-mail must never fail a webhook or a server action.
- Idempotency is Resend's `Idempotency-Key` (`<event>/<entity id>`); nothing about sent e-mails is stored in the DB.
- A new customer e-mail gets a builder ending in `finishCustomer(...)`, a kind in `lib/config/email-preferences.ts` (optional or always sent) and a row in `EMAILS.md`.
- Update `EMAILS.md` in the same change as the code.

## Payment Processing

### Vipps Integration

The platform uses Vipps Recurring API for production payments with DIRECT_CAPTURE flow (no separate capture call — but not instant: each charge is created with `due` = the day after and `retryDays: 3`, so Vipps draws the money on the due date at the earliest and retries for 3 days; until the `charge-captured` webhook the payment row stays `pending`, and the order may already be delivered. UI copy therefore never says the customer «er belastet» at charge creation — it says the payment «er sendt til Vipps» and is drawn «i løpet av et par dager»). Both recurring subscriptions and one-time orders go through the Recurring API — a one-time order creates a Vipps agreement (with a placeholder monthly interval) but no Subscription record, and is charged exactly once:

**Key Files:**
- `lib/database/payment-agreements.ts` - Payment agreement CRUD (Vipps agreement lifecycle, decoupled from subscriptions)
- `lib/payments/vipps/recurring-client.ts` - Vipps Recurring API client (agreements, charges)
- `lib/payments/vipps/base-client.ts` - Shared OAuth and HTTP utilities
- `lib/payments/vipps/webhook-auth.ts` - Shared webhook authentication (HMAC-SHA256)
- `lib/payments/vipps/service.ts` - High-level service layer orchestrating Vipps + database operations
- `lib/payments/vipps/config.ts` - Configuration validation and environment checks
- `app/orders/actions.ts` - Server actions including checkout flow (creates PaymentAgreement + optional Subscription)
- `app/api/webhooks/vipps/recurring/route.ts` - **Critical** webhook handler for Recurring API events - handles agreement activation, order generation, and charge events. Activation is idempotent (status-guarded updates + `getOrderByPaymentAgreementId` existence check — Vipps delivers at-least-once). Answers 500 only on transient failures so Vipps retries; permanent conditions (unknown agreement/charge, malformed body) get 200 because Vipps holds back later webhooks until it sees a 200. charge-failed and charge-creation-failed mark the payment failed and send the customer the payment-failed e-mail (non-blocking). charge-canceled marks the payment cancelled (500 when that write fails) and an agreement stopped by anyone but us keeps its orders untouched; both alert the admins through `reportError` (see Error Alerts) — nothing in the app cancels a Vipps charge itself (`cancelCharge` has no caller).
- `lib/services/order-generation.ts` - Order generation service (calculates pickup dates based on subscription frequency)


**Environment Variables:**
- `VIPPS_CLIENT_ID` - Vipps API client ID
- `VIPPS_CLIENT_SECRET` - Vipps API client secret
- `VIPPS_SUBSCRIPTION_KEY` - Vipps API subscription key
- `VIPPS_MERCHANT_SERIAL_NUMBER` - Vipps merchant serial number (MSN)
- `VIPPS_API_URL` - Vipps API base URL — **required, no default**: exactly `https://apitest.vipps.no` (test) or `https://api.vipps.no` (prod). Anything else makes `createVippsRecurringClient()` throw (fail closed, see `lib/payments/vipps/config.ts` `getVippsApiUrl`)
- `VIPPS_WEBHOOK_SECRET` - Shared webhook secret for HMAC-SHA256 signature verification
- `VIPPS_WEBHOOK_SECRET_RECURRING` - Optional: Recurring API webhook-specific secret (overrides VIPPS_WEBHOOK_SECRET)
- `NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT` - Opt-in (`true`) for the test-only force-accept helper (`forceAcceptAgreementAction` + the "Auto-godkjenn avtale" checkbox on `/orders/confirm`). Honoured only together with the test `VIPPS_API_URL` (`isVippsForceAcceptAllowed`). Set locally and on Vercel Preview (`develop`); never in Production

**Webhook Configuration:**
The platform exposes a single webhook endpoint, registered per Vipps environment with `npm run webhooks -- register …` (`scripts/manage-webhooks.ts`; the Vipps portal only lists webhooks). Production registration + verification steps live in `ENVIRONMENTS.md` → Launch checklist:

1. **Recurring API Webhook**: `https://yourdomain.com/api/webhooks/vipps/recurring`
   - Subscribe to all `recurring.charge.*` events (reserved, captured, canceled, refunded, failed, creation-failed)
   - Subscribe to all `recurring.agreement.*` events (activated, rejected, stopped, expired)

The webhook uses HMAC-SHA256 signature verification with `VIPPS_WEBHOOK_SECRET` (or the endpoint-specific `VIPPS_WEBHOOK_SECRET_RECURRING`).

**Testing:**
- Manual payment option (`payment_provider = 'manual'`) preserved for development
- Vipps test environment available at https://apitest.vipps.no

**Key Database Schema:**
- **New Table:** `payment_agreements` - Decoupled Vipps agreement lifecycle from subscriptions
  - `provider_agreement_id` - Vipps agreement ID (unique)
  - `status` - pending/active/stopped/expired
  - `provider_metadata` - Always stores `terms_consent` (`{ terms_version, accepted_at, early_start_requested }`, written by `createSubscriptionAction`; `TERMS_VERSION` lives in `lib/config/terms.ts` and also renders the "Sist oppdatert" date on `/salgsvilkar`); for one-time orders also stores `order_defaults`; `promo` when a code was applied
- **Removed Tables:** `subscription_plans`, `bag_deliveries` (FLEXIBLE pricing eliminated need for plans)
- **Removed Fields:** `subscriptions.provider_agreement_id` (moved to `payment_agreements`), `subscriptions.next_billing_date`, `subscriptions.billing_cost_ore`, `subscriptions.recurring_weekday`, `subscriptions.expires_at`, `orders.plan_id`, `orders.extra_kg`, `orders.delicate_items_count`
- `subscriptions.payment_agreement_id` - FK to `payment_agreements` (replaces `provider_agreement_id`)
- `subscriptions.order_defaults` - Stores order generation defaults (JSONB):
  - `initial_address` - Pickup/delivery address
  - `special_instructions` - Pickup details
  - `location_city` - Service area (Bergen/Oslo) - used for cleaner matching
  - `default_needs_ironing` - Ironing preference, derived server-side from the customer's selection at checkout
  - `default_cleaner_id` - Default cleaner assignment (orders can be reassigned)
  - `first_pickup_date` - ISO date for first order pickup (replaces recurring_weekday)
  - `customer_estimate` - Customer's checkout selection + estimate total (stamped onto every generated order)
- `orders.payment_agreement_id` - FK to `payment_agreements` (for one-time orders without subscription)
- `orders.customer_estimate` - (JSONB, nullable) Customer's self-reported selection from checkout: `{bags, bedding_sets, iron_everyday_items, iron_formal_items, iron_bedding, estimated_total_ore}`. Informational — the binding price is set by the cleaner
- `orders.total_cost_ore` - **NULLABLE** (NULL until cleaner sets price)
- `orders.cleaner_payout_ore` - **NULLABLE** cleaner's share in øre, stamped with `total_cost_ore` at pricing time from `calculateOrderPrice().cleaner_payout_ore` (full price, before promo); frozen with the price. Paid monthly by manual bank transfer by the 15th of the next month — the sentence cleaners see is `CLEANER_PAYOUT_TERMS_TEXT` in `lib/config/pricing.ts`; monthly sums in `lib/utils/payout.ts`
- `orders.actual_weight_kg` - Actual weight after pickup
- `orders.pricing_notes` - Cleaner's pricing explanation
- `orders.price_calculated_at` - When cleaner calculated price
- `payments.provider_reference` - Merchant reference for webhook lookups (Vipps charge ID, chr_*)
- `payments.provider_metadata` - Stores Vipps charge/transaction details (JSONB)

**Promo Codes (first-order discounts):**
- **New Tables:** `promo_codes` (shared codes: percentage/fixed, optional cap, validity window, optional global redemption cap) and `promo_code_redemptions` (ledger; `UNIQUE(promo_code_id, customer_id)` enforces once-per-customer)
- **New Field:** `orders.promo` (JSONB) - locked discount snapshot stamped onto the **first** order only; `discount_ore` filled in when the cleaner prices the order
- Flow: customer enters code at checkout → validated + snapshot locked into `payment_agreements.provider_metadata.promo` → stamped onto first order + redemption recorded in the agreement-activated webhook → discount applied when cleaner prices the order (`total_cost_ore` = full − discount; **platform-absorbed**, `cleaner_payout_ore` stays the share of the full price; charge can fall below the 500 kr minimum, and a 0 total skips the Vipps charge)
- Before the order is priced, the customer sees the estimate with the code applied: `estimateAfterPromo(estimated_total_ore, promo)` in `lib/config/pricing.ts` (same rule as the real discount) feeds the `/orders/confirm` summary and sticky bar (terms returned by `validatePromoCodeAction`, kept as `promoTerms` in the order-flow store), the customer order page, the dashboard next-pickup card and the order confirmation e-mail. Cleaner and admin surfaces and the price guard keep the full estimate
- See `lib/database/promo-codes.ts`, `computeDiscountOre` in `lib/config/pricing.ts`, and [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#promo-codes--discounts)

**Subscription Cancellation:**
- Entry point: the dashboard subscription strip → `/dashboard/subscription` (details) → `/dashboard/subscription/cancel` (confirmation) → success page. Action: `cancelSubscriptionAction` in `app/dashboard/subscription/actions.ts`.
- **In-flight orders survive:** only not-yet-picked-up orders (`pending_assignment`, `pickup_scheduled`) are cancelled — `lib/database/orders.ts`'s `cancelOrdersBySubscriptionId`. An order already `picked_up` or beyond is never cancelled by subscription cancellation; it completes and is charged normally, becoming the customer's last order. Unlike order-level cancellation, there is no 24h-notice exception — the split is purely by status. `getActiveOrdersBySubscriptionId` reports what's still non-terminal, used to detect whether an in-flight order remains.
- **Deferred Vipps stop:** if an in-flight order exists at cancel time, the subscription flips to `cancelled` immediately (blocking new order generation via the status guard in `checkAndGenerateNextOrders`), but the Vipps agreement is only stopped once that order settles — otherwise the charge for it (created when the cleaner marks it ready) would fail. `stopVippsAgreementForCancelledSubscription` (`lib/payments/vipps/service.ts`) does the stop; it's safe to call unconditionally (no-ops unless the subscription is cancelled, its agreement is still active, no active orders remain, and **no Vipps charge for the subscription's orders is still pending/authorized** — stopping the agreement would cancel a pending charge; orphan `pending` rows with no `provider_reference` older than 15 min are ignored, see `isOrphanPendingPayment` in `lib/utils/payment-status.ts`) and is called from two places: the charge-captured webhook handler and `completeDeliveredOrder` (`lib/services/complete-order.ts`), which runs it unconditionally on every delivery completion. Between them every ordering is covered: capture-before-delivery (webhook no-ops on the active order, completion stops), same-day delivery with the charge still pending (completion defers, the webhook stops after capture), and 0-total promo orders with no charge event (completion stops).

**One-Time Agreement Stop:**
- A one-time order's Vipps agreement is stopped as soon as nothing more will be charged on it, so it never lingers in the customer's Vipps app. One function does it: `stopVippsAgreementForOneTimeOrder(orderId)` in `lib/payments/vipps/service.ts` (never throws; a failed stop is logged and never fails or undoes the caller).
- Three callers: `cancelOrderAction` and `cancelOrderAdminAction` (right after the cancel write, before the cancellation e-mail, one-time orders only) and `completeDeliveredOrder` (the `else` of the subscription branch). The `charge-captured` webhook keeps its own stop for paid one-time orders.
- Safe to call unconditionally. It stops only when the order is one-time (`subscription_id` NULL, `payment_agreement_id` set), is `cancelled` or `completed`, and its agreement is still `active`. It refuses while a Vipps charge for the order is `pending`/`authorized` (the capture webhook stops the agreement afterwards; orphan pending rows don't count), when the order's payments cannot be read, and for a `completed` order with a price above 0 and no live payment (`hasLivePayment`) — a failed charge must stay retryable with «Belast på nytt», which needs an active agreement.
- So a completed order stops its agreement at delivery when the total is 0 kr (100 % promo, no charge, no capture webhook) or when the charge was captured but the webhook's stop failed.
- Our own stop returns as `recurring.agreement-stopped.v1` with `actor = MERCHANT`, which the webhook ignores. A stop by the customer (Vipps app) or by Vipps marks the agreement `stopped`, leaves the order as it is and e-mails the admins when the order still needs payment — «Belast på nytt» refuses a stopped agreement, so the money has to be collected outside the app.

**Charge idempotency (#115):** `createChargeForCompletedOrder` sends `chargeIdempotencyKey(order.id, <number of the order's payment rows with a provider_reference>)` as the Vipps `Idempotency-Key`. A creation attempt that timed out leaves no reference, so «Belast på nytt» re-sends the same key and Vipps returns the original charge instead of creating a second one (verified against the Vipps test API); after a confirmed charge the key moves on, so a retry of a genuinely failed charge is a new charge. If the count cannot be read, no payment row and no charge are created.

**Migration history:** The migration history was squashed into a single baseline
before production launch — `supabase/migrations/20260606233033_initial_schema.sql`
contains the complete current schema (all tables, enums, functions, triggers, RLS
policies, and grants). The individual incremental migrations (FLEXIBLE pricing
redesign, `order_defaults` refactor, `payment_agreements` decoupling, promo codes,
etc.) were folded into this baseline. New schema changes should be added as fresh
timestamped migrations after it. See [MIGRATION_SQUASH_RUNBOOK.md](./MIGRATION_SQUASH_RUNBOOK.md)
for the squash/remote-reconciliation procedure.

**Order Generation Architecture (Rolling Window):**
The platform uses a **rolling window** pattern that maintains 1 upcoming order at all times:

**Recurring subscriptions:**
1. PaymentAgreement + Subscription created → Vipps checkout
2. Agreement activated → PaymentAgreement + Subscription activated → First order generated with `total_cost_ore = NULL`
3. Cleaner sets price after pickup → Creates charge via `payment_agreements.provider_agreement_id`
4. Order completes → Next order auto-generated (pickup date based on frequency)
5. Pattern repeats indefinitely until subscription paused/cancelled

**One-time orders:**
1. PaymentAgreement created (no Subscription) → order_defaults stored in provider_metadata → Vipps checkout
2. Agreement activated → PaymentAgreement activated → Single order generated from metadata
3. Cleaner sets price → Creates charge → Order completes (no further orders generated); the agreement is stopped when the charge is captured, at completion for a 0 kr total, or right away when the order is cancelled (see One-Time Agreement Stop)

This eliminates batch order generation - orders are created just-in-time as needed.

**Order payload mapping (single source of truth):** There are two order-creation paths — the first order (in the Vipps webhook's `generateFirstOrder`) and the rolling-window next order (in `checkAndGenerateNextOrders`). Both build their `createOrder` payload via **`buildOrderData(orderDefaults, params)`** in `lib/services/order-generation.ts`. This is the only place `order_defaults` → order fields (address, coordinates, service prefs) is mapped, so the two paths can't drift. When adding a field that flows from `order_defaults` onto orders, add it to `buildOrderData` and its test — never assemble a `createOrder` payload inline.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
