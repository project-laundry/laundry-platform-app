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
│   ├── admin/              # Admin dashboard (layout = shell + role guard; page = overview: count tiles + attention sections «I dag» / «Forsinket» / «Venter på tildeling» / «Betalinger å følge opp» / «Ordre ikke generert» from lib/database/admin-attention.ts; a failed query shows an error, never 0 or an empty list)
│   │   ├── orders/         # Order list + per-order detail page (edit details, cleaner (re)assignment, «Belast på nytt» retry of a failed Vipps charge, price override while nothing is charged, «Marker som hentet/klar/levert» fallbacks, pre-pickup cancel with a customer-visible reason, internal admin_notes)
│   │   ├── cleaners/       # Cleaner list (links only) + per-cleaner detail page [cleanerId] with all onboarding data (tax id/bank account behind RevealField), orders + payout sums, and the actions: approve, reject with reason (CleanerRejectControl → rejectCleanerAction), deactivate/reactivate (verification_status), pause/resume new orders (is_accepting_orders)
│   │   ├── customers/      # Customer list + per-customer detail
│   │   ├── payments/       # Payment list (read-only)
│   │   ├── promo-codes/    # Promo code list, create/edit, redemptions per code
│   │   ├── drivers/        # Driver list, create/edit (account + profile) — dormant, not in AdminNav
│   │   └── admins/         # Admin user list, create/edit
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
│   │   ├── settings/       # Customer "Min konto": name + phone (users row via updateUserContact), password (browser supabase.auth.updateUser, links to /auth/forgot-password), subscription pickup address + instructions (rewrites order_defaults.initial_address, same city only, optionally copied onto the not-yet-picked-up order)
│   │   ├── subscription/   # Subscription details + cancel flow — dormant while SUBSCRIPTIONS_OFFERED is false (redirects to /dashboard unless the customer already has a subscription)
│   │   ├── cleaner/        # Cleaner dashboard: page.tsx = active orders grouped by next step (Dagens runde / Kommende hentinger / Vaskes) + one income row — «Dagens runde» is one trip of pickups due today (+ overdue) AND every ready-to-deliver order, each marked Hent/Lever, ordered as the shortest round trip from the cleaner's base (`optimizeRoundTrip` in `lib/utils/route.ts`, straight-line) and «Åpne ruten» opens it in Google Maps (`buildRoundTripUrl`); [orderId]/ = the order journey, one step card at a time (OrderStep: pickup → wash count + price → deliver; the wash confirm saves the details and marks ready in one go); earnings/ = monthly payout, finished orders, VAT limit; settings/ = profile + availability (is_accepting_orders + weekly_schedule)
│   │   └── driver/         # Driver dashboard (daily route) — dormant, driver role only
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
│   ├── coming-soon/        # Shell of the customer landing page (light hero with optional photo and an `action` slot for the «Bestill henting» button, CrossPromo); HowItWorksStory.tsx = the illustrated 5-step story. The folder name is historical — nothing is coming-soon any more
│   ├── landing/            # Navbar (legal/contact/price pages), Footer
│   ├── forms/              # Form components (empty)
│   ├── layout/             # Layout components (empty)
│   ├── legal/              # CompanyContactCard — the company details box shared by /salgsvilkar, /personvern and /personvern-renser (values from lib/config/company.ts)
│   └── ui/                 # UI elements
│       └── LogoutButton.tsx
├── hooks/                  # Custom React hooks (empty)
├── lib/                    # Core utilities and business logic
│   ├── ai/                 # Claude integration: machine-recognition.ts (photo → machine suggestion, never throws), config.ts (ANTHROPIC_API_KEY)
│   ├── auth/               # requireRole/assertRole guards (require-role.ts); signup error mapping (signup-errors.ts); password-reset paths + error mapping (password-reset.ts); login error mapping (login-errors.ts); ?next= sanitizing (next-path.ts)
│   ├── config/
│   │   ├── company.ts      # COMPANY (legal name, org number, postal address, phone, e-mail, Instagram/Facebook URLs) + formatOrgNumber/phoneHref/formatPostalAddress — the ONLY place these values live; footer, /kontakt, the legal pages and bli-renser/success read from it. Confirm the values before launch
│   │   ├── postal-codes.ts # POSTAL_CODE_RANGES (Bergen, Oslo) + OFFERED_CITIES (['Bergen'] in the first version) — the one switch for where we operate: getCityFromPostalCode answers null for a city that is not offered, so Oslo postal codes are "outside the service area" in the order flow, address edits, cleaner onboarding and settings; serviceAreaText('og' | 'eller') renders every "vi er i …" sentence (landing badge, footer, FAQ, error messages, /salgsvilkar, share image). To open Oslo, add it to OFFERED_CITIES and bump TERMS_VERSION — keep the Oslo code, it is intentionally dormant
│   │   ├── pricing.ts      # Pricing constants and both calculators: calculateOrderPrice (cleaner-binding: per 5kg load + 3 ironing groups) and calculateCustomerEstimate (customer estimate: per bag/set/piece). Ironing groups exist in the model but are NOT offered in the first version — hidden on every public surface, see BUSINESS_LOGIC.md "Ironing". CLEANER_MIN_PAYOUT_PER_ORDER_ORE is the "minst 350 kr per oppdrag" cleaner marketing leads with (70 % of the 500 kr order minimum)
│   │   ├── subscriptions.ts # SUBSCRIPTIONS_OFFERED (false in the first version) — the one switch that hides recurring pickups: order flow, dashboard empty state, Min konto, /salgsvilkar section 7 (which then shows the one-time change/cancellation rules instead), /personvern, admin customer card; createSubscriptionAction forces 'on_demand' while it is false. See BUSINESS_LOGIC.md "Subscriptions (not in the first version)"
│   │   └── terms.ts        # TERMS_VERSION (ISO date of the current /salgsvilkar text, bump on every terms change) + formatTermsVersion; stamped into payment_agreements.provider_metadata.terms_consent at checkout
│   ├── database/           # Database CRUD operations
│   │   ├── admin-attention.ts  # Today/overdue/waiting/failed lists for /admin and the digest; every list is `T[] | null` (null = query failed). Rules: overdue pickup = scheduled_date < today (Oslo) and not picked up; ready too long = ready_for_delivery_at older than READY_TOO_LONG_DAYS; payments = failed + orphan pending + stale pending (STALE_PENDING_DAYS, lib/utils/payment-status.ts); "order not generated" = active subscription/agreement older than ACTIVATION_GRACE_MINUTES with no (active) order. delivery_date is never used for lateness
│   │   ├── cleaners.ts     # Cleaner queries & matching
│   │   ├── customers.ts    # Customer queries
│   │   ├── orders.ts       # Order CRUD
│   │   ├── payment-agreements.ts  # Payment agreement CRUD (Vipps agreement lifecycle)
│   │   ├── payments.ts     # Payment operations (includes Vipps metadata management)
│   │   ├── promo-codes.ts  # Promo code validation & redemption (shared, once-per-customer)
│   │   └── subscriptions.ts   # Subscription operations (recurring order management)
│   ├── email/
│   │   ├── admin-mail.ts   # sendToAdmins({ subject, text, idempotencyKey? }) → { recipients, sent }: one message PER admin (`users.role = 'admin'`, not deleted), key suffixed with the admin's user id — a bouncing admin address must never suppress the others' copy. Used by the digest, the staff order alerts and the error alerts
│   │   ├── send.ts         # sendEmail(): the ONE Resend transport (fetch → POST /emails, optional Idempotency-Key, never throws, { ok } | { ok: false, error }); CUSTOMER_EMAIL_FROM. Used by the admin digest and the customer e-mails
│   │   ├── customer-emails.ts # Pure builders for the customer e-mails → { subject, text, html }: buildOrderConfirmationEmail (#23), buildPriceReceiptEmail (#26), buildPaymentFailedEmail (#28), buildOrderDeliveredEmail (#27), buildOrderPickedUpEmail (#25), buildPickupReminderEmail (#24), buildOrderCancelledEmail + buildPickupRescheduledEmail (#29), buildCleanerConfirmedEmail (#30). Text and HTML rendered from one block list; HTML wrapper mirrors supabase/templates/
│   │   └── staff-emails.ts # Pure builders for the staff e-mails: buildCleanerNewOrderEmail («Nytt oppdrag», { subject, text, html } with the customer-emails block list and HTML wrapper), buildAdminNewOrderEmail and buildAdminOrderUnassignedEmail (plain text { subject, text })
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
│   │   ├── staff-emails.ts      # sendCleanerNewOrderEmail(orderId) / sendAdminNewOrderEmail(orderId) / sendAdminOrderUnassignedEmail(orderId, declinedByName) — load (getOrderForStaffEmail, getUsersByRole), build, send; NEVER throw, return void (callers: Vipps webhook, assignCleanerAction, declineCleanerOrder). See Staff E-mails
│   │   └── staff-accounts.ts    # Staff (driver/admin) account creation: auth user + role flip + cleanup
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
└── proxy.ts                # Supabase session refresh + order-flow login requirement
```

**Customer-facing wording:** customers count **poser** (`PRICING.per_bag_ore`), and the per-bag price is never shown without the order minimum next to it ("119 kr per pose, minste bestilling 500 kr") — on its own it reads as a 119 kr order. Cleaners count **vask** — one full machine, up to 5 kg (`PRICING.price_per_load_ore`); mention the kilos only where a cleaner needs the definition (FAQ, payout box, dashboard), never on customer surfaces. Cleaner earnings are quoted as the guaranteed minimum per order (`CLEANER_MIN_PAYOUT_PER_ORDER_ORE`), not a per-load figure. "Nabo" is a sales pitch, not a description: fine in headlines, tab titles, share images and cross-promos, but whoever actually washes is "en lokal renser" / "en godkjent renser i området" — never "i nabolaget". Don't promise turnaround times, free delivery, ironing or a quality guarantee anywhere — see the honest-claims note in `components/coming-soon/HowItWorksStory.tsx`.

## Architecture Patterns

### Server Actions

Server actions handle mutations from the UI:

- `app/orders/actions.ts` - Subscription creation, Vipps agreement creation, customer queries; `cancelOrderAction` and `updateOrderPickupDateAction` e-mail the customer after the write (see Customer E-mails); `cancelOrderAction` also stops a one-time order's Vipps agreement right after the cancel write (`stopVippsAgreementForOneTimeOrder`, see One-Time Agreement Stop)
- `app/auth/actions.ts` - Public signup pre-check (`checkSignupAvailabilityAction`): both signup forms call it before `supabase.auth.signUp` because Supabase Auth hides which constraint failed inside `handle_new_user`; the `signUp` result is then mapped by `lib/auth/signup-errors.ts`
- `app/bli-renser/actions.ts` - Cleaner profile creation (`createCleanerProfileAction`) and the step-1 tax id pre-check (`checkTaxIdAvailabilityAction`): `cleaners.tax_id` is UNIQUE, so the business form checks it before advancing instead of letting the final insert fail on step 5; the action also maps a `23505` from the insert to the same message as a race fallback; and the step-3 photo helper (`recognizeMachineAction`): guards with `assertRole(["cleaner"])`, validates the base64 payload, and returns `lib/ai/machine-recognition.ts`'s `{ status: 'ok' | 'no_machine' | 'unavailable' }` result for the form to pre-fill from
- `app/dashboard/settings/actions.ts` - Customer account page: `updateCustomerContactAction` (name/phone → `updateUserContact`, phone stored as `+47` + 8 digits) and `updateSubscriptionAddressAction` (rewrites `order_defaults.initial_address` on the active subscription — city derived from the postal code must equal `location_city`; validated via `validateAddress`, coordinates replaced; optional copy onto `pending_assignment`/`pickup_scheduled` orders via `updateUpcomingOrdersAddressBySubscriptionId`). Password change is client-side (`supabase.auth.updateUser`), no action
- `app/admin/orders/actions.ts` - Cleaner (re)assignment (every assignment e-mails the newly assigned cleaner «Nytt oppdrag», see Staff E-mails; assigning a `pending_assignment` order also sends the customer the "cleaner confirmed" e-mail, see Customer E-mails), admin order edits (dates, address — a changed pickup date e-mails the customer), `retryChargeAction` (re-creates the Vipps charge for an order with no live payment — gated by `hasLivePayment` in `lib/utils/payment-status.ts`), `cancelOrderAdminAction` (pre-pickup only, reason required → `cancellation_reason`, shown in the customer's cancellation e-mail, no 24 h rule, rolling window regenerates for an active subscription, a one-time order's Vipps agreement is stopped right after the cancel write), `overrideOrderPriceAction` (`in_cleaning`/`ready_for_delivery` with no live payment; same formula as the cleaner via `calculateOrderPrice` + `applyPromoDiscount`, writes `updateOrderPricingByAdmin`), `adminMarkReadyAction` (exit for an order stuck in `in_cleaning` — shares `lib/services/ready-order.ts` with the cleaner's «Marker som klar», so it charges the customer), `updateAdminNotesAction` (`orders.admin_notes`, any status)
- `app/dashboard/cleaner/actions.ts` - The cleaner's order steps (picked up, save wash details, ready + charge, delivered) and `declineCleanerOrder`: guarded `declineOrder`, then automatic re-assignment — `findAvailableCleaner` minus `declined_by_cleaner_ids` → `assignCleanerToPendingOrder` (guarded) → «Nytt oppdrag» to the new cleaner; nobody available or pickup date already past → the order stays `pending_assignment` and every admin gets «Ordre venter på tildeling». The customer gets nothing either way (see Staff E-mails)
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

`src/proxy.ts` (Next 16 proxy convention) refreshes Supabase auth sessions on every request. On every host, a signed-out page load under `/orders/*` is redirected to signup/login with `?next=` (`orderAuthRedirect`). There is no pre-launch gate any more: both the customer and the cleaner side are public on `nooracare.no`. Role guards live in `src/lib/auth/require-role.ts` (`requireRole` for pages/layouts, `assertRole` for server actions); privileged roles (`admin`, `driver`) can never be chosen at signup — the `handle_new_user` trigger only honors `customer`/`cleaner` metadata.

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

## Admin Digest

Every day at 06:00 UTC a Vercel cron (`vercel.json` → `crons`, Production only) calls `GET /api/cron/admin-digest` with `Authorization: Bearer $CRON_SECRET`. The route e-mails the same lists `/admin` shows (`lib/database/admin-attention.ts` → `lib/services/admin-digest.ts`) as plain text to every `users` row with `role = 'admin'` and `deleted_at IS NULL`, through the shared `sendEmail` transport (`lib/email/send.ts` — Resend REST API with `fetch`, no SDK). It is sent even when there is nothing to do, so a missing e-mail means the cron or sender is broken. Instant alerts for failures are separate — see Error Alerts. The two order alerts to admins («Ny ordre», «Ordre venter på tildeling») are separate — see Staff E-mails.

- **One message per admin** (`sendToAdmins` in `lib/email/admin-mail.ts`), for the digest, the order alerts and the error alerts alike: with every admin on one message, a single bouncing address makes Resend suppress it for all. The digest route answers 502 `{ sent, failed }` when any admin's copy is rejected. Every admin account needs a working mailbox — a bounce also hurts the sending domain.
- **Env**: `CRON_SECRET`, `RESEND_API_KEY`, optional `ADMIN_DIGEST_FROM` (see `ENVIRONMENTS.md`). The `nooracare.no` sending domain is verified in Resend (shared with the Auth e-mails).

## Error Alerts

The app's error tracker (#119) — no third-party service. `reportError(source, error, details?)` in `lib/services/error-alerts.ts` logs the error and e-mails it as plain text to every admin (`users.role = 'admin'`, `deleted_at IS NULL`, sender `ADMIN_DIGEST_FROM`) through the shared `sendEmail` transport. It **never throws, returns void and must be awaited**. The same source + message is mailed at most once per hour (Resend `Idempotency-Key` `error-alert/<hash>/<YYYY-MM-DDTHH>`). The mail carries the error text, a trimmed stack and the ids the caller passes — never a request body or customer data.

- **Unhandled errors:** `src/instrumentation.ts` → `onRequestError` reports every error Next.js catches in a page render, route handler or server action (path without query string). Production builds only (staging and production; never `next dev`); `notFound()`/`redirect()` digests are skipped.
- **Swallowed failures that are reported explicitly:** the Vipps webhook's 500 path (e.g. first-order generation failed after activation), `charge-failed` and `charge-creation-failed` webhooks, a failed charge creation in `markOrderReadyAndCharge`, every failed Vipps agreement stop (`stopVippsAgreementForOneTimeOrder`, `stopVippsAgreementForCancelledSubscription`, the stop after capture), and a failed rolling-window order generation in `completeDeliveredOrder`.
- When adding a `catch` that keeps the customer or Vipps unaffected by swallowing an error, call `await reportError(...)` there instead of only `console.error`.
- **Env:** `RESEND_API_KEY`, optional `ADMIN_DIGEST_FROM` — nothing new.

## Customer E-mails

Transactional e-mails to customers (epic #32): Norwegian, sender `NooraCare <no-reply@nooracare.no>` with reply-to `COMPANY.email`, no marketing content (so no consent needed). One transport for the whole app: `sendEmail` in `lib/email/send.ts` (Resend REST via `fetch`, `RESEND_API_KEY`, no SDK). Builders are pure (`lib/email/customer-emails.ts`, `{ subject, text, html }` from one block list — the HTML wrapper mirrors `supabase/templates/`); `lib/services/customer-emails.ts` loads the order (`getOrderForCustomerEmail`) and payment (`getPaymentById`), builds and sends. The service functions **never throw and return void**: a failed e-mail is logged and must never fail the Vipps webhook or a server action. Idempotency is Resend's `Idempotency-Key` (`<event>/<entity id>`, 24 h) on top of the already guarded triggers — no `*_sent_at` columns, nothing stored in the DB; `https://resend.com/emails` is the delivery log.

| E-mail | Trigger (exact code path) | Key |
|---|---|---|
| Order confirmation (#23) | `generateFirstOrder` in the `agreement-activated` webhook, right after `createOrder` succeeds (subscription and one-time; the duplicate-delivery branch sends nothing). Pickup date + address, what the customer sends, the checkout figure as an «Estimat: ca. X kr» row (no explanatory text about the estimate — removed on purpose), promo line, subscription frequency + cancel link (`/dashboard/subscription`) for subscriptions only (dormant while `SUBSCRIPTIONS_OFFERED` is false). Variant (#30): when the order is created `pending_assignment` the pickup date the customer chose still stands, so the e-mail is the same confirmation (same subject, title and «Dato» row) and only the intro adds that we are assigning a local cleaner, the customer does nothing and gets an e-mail when the cleaner is in place — no deadline, and never "the date is not confirmed" | `order-confirmation/<order.id>` |
| Price set + receipt (#26) | `markOrderReadyAndCharge` after `createChargeForCompletedOrder` returns (cleaner «Tøyet er klart til levering» → «Bekreft og belast», and the admin fallback «Marker som klar») and `retryChargeAction` for each re-charge; also for a 0-total promo order (no charge). Price lines from `calculateOrderPrice`, promo deduction, `pricing_notes` (the checkout estimate is not mentioned), Vipps charge id. Not sent when charge creation throws (`chargeFailed`) | `price-receipt/<payment.id>` (`price-receipt/order-<order.id>` for 0-total) |
| Payment failed (#28) | `charge-failed` and `charge-creation-failed` webhooks after the payment row is marked `failed` (both handlers fail the row first). Copy states the retry policy: nothing to do, we re-charge within a few days («Belast på nytt»), we get in touch if that fails, delivery is unaffected | `payment-failed/<payment.id>` |
| Laundry delivered (#27) | `completeDeliveredOrder` (`lib/services/complete-order.ts`), last step after the guarded transition to `completed`, the rolling window and the agreement-stop check — cleaner «Levert til kunden», admin «Marker som levert», dormant driver delivery stop. Delivery date (`delivery_date`) + address, a payment line derived from the order's `payments` rows (nothing charged / captured / in flight; silent when the charge failed or does not exist), dormant subscription paragraph without a date | `order-delivered/<order.id>` |
| Laundry picked up (#25) | `markOrderPickedUpAction` (cleaner «Jeg har hentet tøyet», shows the pickup time) and `adminMarkPickedUpAction` (admin fallback, no time), each right after the guarded `pickup_scheduled → in_cleaning` write succeeded. Names the cleaner by the whole `cleaners.display_name`, says the next e-mails are "price set" and "delivered" (no estimate text). No delivery date or deadline. The dormant driver flow sends nothing | `order-picked-up/<order.id>` |
| Pickup reminder (#24) | `GET /api/cron/pickup-reminders` (daily cron, 16:00 UTC) for every order in `pickup_scheduled` with `scheduled_date` = tomorrow (Oslo). Pickup date, time window (`PICKUP_TIME_RANGE`) and address, the customer's «Henteinstruksjoner» / «Vaskeinstruksjoner», the cleaner's `display_name`, button to the order page. Offers changing address, instructions and date — not cancellation (refused < 24 h before pickup) | `pickup-reminder/<order.id>/<scheduled_date>` |
| Order cancelled (#29) | `cancelOrderAction` (customer, both exits: with and without "cancel the subscription too") and `cancelOrderAdminAction` (admin; the required `cancellation_reason` is printed as «Årsak»), after the cancel write and the subscription step. Says "ingenting er trukket … du blir ikke belastet" (true for every cancellable status) and nothing about the Vipps agreement (a one-time order's agreement is stopped silently right after the cancel write). Subscription orders only: next pickup date, or "abonnementet er sagt opp" | `order-cancelled/<order.id>` |
| New pickup date (#29) | `updateOrderPickupDateAction` (customer) and `updateOrderDetailsAction` (admin, only when `scheduled_date` changed — wording "Vi har endret …"), after the write. Old date → new date, address, «Henteinstruksjoner». Saving the same date sends nothing | `pickup-rescheduled/<order.id>/<orders.updated_at before the write>` — one key per real change, so A → B → A within 24 h is never swallowed |
| Cleaner confirmed (#30) | `assignCleanerAction` after `assignCleanerToOrder`, only when the order was `pending_assignment` before (never on a re-assignment between cleaners). Announces the cleaner («Renseren din er på plass»), not the pickup — that was already confirmed. Pickup date as stored after the assignment (the action never changes it), address, the cleaner's whole `display_name` (trimmed), link to the order page. Skipped when the order is no longer `pickup_scheduled` or its pickup date is already past. A cleaner decline sends nothing; the next assignment sends this e-mail again | `cleaner-confirmed/<order.id>/<number of declines>` |

Not sent (deliberately): other status changes (assignment, ready for delivery), `charge-captured` (the receipt went out at charge creation), the synchronous charge-creation failure inside `createChargeForCompletedOrder` (the admin's retry sends the price e-mail instead). `out_for_delivery` (dormant driver flow) sends nothing — the delivered e-mail goes out on `completed` only. Orders cancelled as a side effect of cancelling a whole subscription or of a Vipps-initiated agreement stop get no cancellation e-mail; address-only edits get no e-mail.

- **Env**: `RESEND_API_KEY` (missing → send skipped and logged), `NEXT_PUBLIC_APP_URL` (links). Staging sends real mail to the test accounts.

## Staff E-mails

E-mails to the cleaner and the admins about orders. Same architecture as the customer e-mails: pure builders (`lib/email/staff-emails.ts`), a service that **never throws and returns void** (`lib/services/staff-emails.ts`), the shared `sendEmail` transport, Resend `Idempotency-Key`, nothing stored in the DB. The cleaner mail is sent from `NooraCare <no-reply@nooracare.no>` with reply-to `COMPANY.email` to the cleaner's `users.email`; the admin mails are plain text from `ADMIN_DIGEST_FROM` (default `NooraCare <varsel@nooracare.no>`) to every `users` row with `role = 'admin'` and `deleted_at IS NULL` — the digest's recipients.

| E-mail | Trigger (exact code path) | Key |
|---|---|---|
| «Nytt oppdrag» (cleaner) | `sendCleanerNewOrderEmail` — `generateFirstOrder` in the `agreement-activated` webhook after `createOrder` (skipped inside when the order has no cleaner), `assignCleanerAction` after `assignCleanerToOrder` (first assignment and re-assignment), `declineCleanerOrder` after an automatic re-assignment. Pickup date, time window (`PICKUP_TIME_RANGE`), address, «Henteinstruksjoner», what the customer says they send (`customer_estimate`), button to `/dashboard/cleaner/<order id>`. No customer name, phone or e-mail. Skipped when the order is not `pickup_scheduled` | `cleaner-new-order/<order.id>/<cleaner_id>/<assigned_at>` — one per assignment, so A → B → A within 24 h is three e-mails |
| «Ny ordre» (admins) | `sendAdminNewOrderEmail` — `generateFirstOrder`, same place, first orders only. Order number, city, pickup date, cleaner or «ingen renser ennå», link to `/admin/orders/<order id>` | `admin-new-order/<order.id>` |
| «Ordre venter på tildeling» (admins) | `sendAdminOrderUnassignedEmail` — `declineCleanerOrder` when the decline ended without a new cleaner (nobody available, pickup date already past, or the re-assignment failed). Who declined, city, pickup date, number of declines, link. Skipped when the order is no longer `pending_assignment` | `admin-order-unassigned/<order.id>/<number of declines>` |

Not sent (deliberately): nothing to the cleaner who loses an order on an admin re-assignment; nothing for rolling-window subscription orders (dormant) or for a cleaner change caused by a customer reschedule (`updateOrderPickupDateAction`); no admin alert for an order created without a cleaner beyond the «ingen renser ennå» in «Ny ordre». A decline or an automatic re-assignment sends the customer nothing.

- **Env**: `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, optional `ADMIN_DIGEST_FROM` (see `ENVIRONMENTS.md`). Unlike the digest (a Production-only cron) these are sent from every environment that has `RESEND_API_KEY`, so staging test orders e-mail the staging admin users.

## Pickup Reminders

Every day at 16:00 UTC (17:00 in Oslo in winter, 18:00 in summer) a Vercel cron (`vercel.json` → `crons`, Production only) calls `GET /api/cron/pickup-reminders` with `Authorization: Bearer $CRON_SECRET`. The route loads the orders in `pickup_scheduled` whose `scheduled_date` is tomorrow in the Oslo calendar (`tomorrowInOslo` → `getOrdersForPickupReminder`) and sends each customer the "sett posen klar" e-mail (`sendPickupReminderEmail` → `buildPickupReminderEmail`, see Customer E-mails). `pending_assignment` orders get nothing. Sends are sequential; one failure never stops the batch. The route answers `{ date, sent, failed }` — 200 when nothing failed, 502 when something did (Vercel does not retry crons; the code only makes the failure visible in the logs).

- **Re-runs are safe**: the Resend `Idempotency-Key` is `pickup-reminder/<order.id>/<scheduled_date>` (kept 24 h; the cron runs once a day). Calling the route again the same evening re-sends nothing and retries what failed; a rescheduled order gets a reminder for its new date. Nothing is stored in the DB.
- **No catch-up**: if the cron does not run on an evening, those customers get no reminder unless someone calls the route by hand before midnight Oslo time.
- **Env**: `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL` (see `ENVIRONMENTS.md`).

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
- `app/api/webhooks/vipps/recurring/route.ts` - **Critical** webhook handler for Recurring API events - handles agreement activation, order generation, and charge events. Activation is idempotent (status-guarded updates + `getOrderByPaymentAgreementId` existence check — Vipps delivers at-least-once). Answers 500 only on transient failures so Vipps retries; permanent conditions (unknown agreement/charge, malformed body) get 200 because Vipps holds back later webhooks until it sees a 200. charge-failed and charge-creation-failed mark the payment failed and send the customer the payment-failed e-mail (non-blocking).
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
- Our own stop returns as `recurring.agreement-stopped.v1` with `actor = MERCHANT`, which the webhook ignores.

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
