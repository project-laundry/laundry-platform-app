# EMAILS.md

Every e-mail NooraCare sends: who gets it, what triggers it, and the rules they all follow.
Read this before adding or changing an e-mail. Error tracking and the price guard are
described in `CLAUDE.md` (Error Alerts, Price Guard); only their e-mails are listed here.

## Overview

All app e-mails go through one transport, `sendEmail` in `src/lib/email/send.ts` (Resend). The
three Supabase Auth e-mails are the exception: Supabase sends them itself over SMTP.

### To customers

Sender `NooraCare <no-reply@nooracare.no>`, reply-to `COMPANY.email`. Builders in
`src/lib/email/customer-emails.ts`, senders in `src/lib/services/customer-emails.ts`. "Can be
turned off" is the customer's own choice on `/dashboard/settings/emails`
(`src/lib/config/email-preferences.ts`).

| E-mail | Subject starts with | Sent when | Can be turned off |
|---|---|---|---|
| Order confirmation | «Bestilling #… er bekreftet» | The Vipps agreement is activated and the order is created | No |
| Cleaner confirmed | «Renseren din er på plass» | An admin assigns a cleaner to an order that was waiting | Yes (`cleaner_confirmed`) |
| Pickup reminder | «Vi henter tøyet ditt i morgen» | Daily cron, the evening before pickup | Yes (`pickup_reminder`) |
| Laundry picked up | «Tøyet ditt er hentet» | The cleaner (or an admin) marks the order picked up | Yes (`picked_up`) |
| Price set + receipt | «Prisen er satt» | The order is marked ready and the Vipps charge is created, and on every re-charge | No |
| Payment failed | «Betalingen for bestilling #… gikk ikke gjennom» | Vipps reports a failed charge | No |
| Laundry delivered | «Tøyet ditt er levert» | The order becomes `completed` | Yes (`delivered`) |
| Evaluation | «Hvordan var vasken?» | Daily cron, the day after delivery, unless the order is already evaluated. The first question is five link buttons (1–5) that open the form with that score selected | Yes (`evaluation`) |
| Order cancelled | «Bestilling #… er kansellert» | The customer or an admin cancels the order | No |
| New pickup date | «Ny hentedato for bestilling #…» | The customer or an admin changes the pickup date | No |

### To cleaners

Same sender and reply-to. Builders in `src/lib/email/staff-emails.ts`, senders in
`src/lib/services/staff-emails.ts`. Cleaners cannot turn these off, and they carry no link to
the e-mail settings.

| E-mail | Subject starts with | Sent when |
|---|---|---|
| «Nytt oppdrag» | «Nytt oppdrag – henting …» | An order is assigned to the cleaner (at creation, by an admin, or after another cleaner declined) |
| «Ny hentedato» | «Ny hentedato – …» | The pickup date of the cleaner's order changes |
| «Oppdraget er flyttet» | «Ordre #… er ikke lenger ditt oppdrag» | A customer reschedule moved the order to another cleaner |

### To admins

Plain text from `ADMIN_DIGEST_FROM` (default `NooraCare <varsel@nooracare.no>`), one message
per admin (`sendToAdmins` in `src/lib/email/admin-mail.ts`). A deactivated administrator (`users.deleted_at` set — «Deaktiver» on `/admin/admins/<id>`) gets none of these.

| E-mail | Subject starts with | Sent when | Described in |
|---|---|---|---|
| Daily digest | «NooraCare <dato>: …» | Daily cron 06:00 UTC, production only | Admin digest below |
| «Ny ordre» | «Ny ordre #…» | A first order is created | Staff e-mails below |
| «Ordre venter på tildeling» | «Ordre #… venter på tildeling» | A cleaner declined and nobody took over | Staff e-mails below |
| «Ny renser venter på godkjenning» | «Ny renser venter på godkjenning – …» | A cleaner finished onboarding and waits for approval | Staff e-mails below |
| Price review | «Pris må godkjennes – ordre #…» | The price guard held a charge | `CLAUDE.md` → Price Guard |
| Error alert | «NooraCare feil: …» | `reportError` is called, at most once per hour per error | `CLAUDE.md` → Error Alerts |

### From Supabase Auth

Sent by Supabase over SMTP through the same Resend account, from
`NooraCare <no-reply@nooracare.no>`. Templates in `supabase/templates/`; the hosted projects are
configured by hand, so after any template or subject change paste it into **both** dashboards
(`ENVIRONMENTS.md` → "Supabase Auth e-mails"). They do not go through `sendEmail`, so its
test-address guard does not cover them.

| E-mail | Subject | Template |
|---|---|---|
| Confirm e-mail address | «Bekreft e-postadressen din hos NooraCare» | `confirmation.html` |
| Reset password | «Tilbakestill passordet ditt hos NooraCare» | `recovery.html` |
| Login link | «Innloggingslenken din til NooraCare» | `magic_link.html` |

## Rules every app e-mail follows

- **One transport.** `sendEmail` is the only code that talks to Resend. It never throws; it
  returns `{ ok }` or `{ ok: false, error }`.
- **A lost e-mail never breaks the action.** The sender functions never throw and return void
  (the pickup reminder returns a boolean for the cron's count). A failure is logged, and
  `https://resend.com/emails` is the delivery log.
- **No double sends.** Every send carries a Resend `Idempotency-Key` (`<event>/<entity id>`,
  kept 24 h). Nothing about sent e-mails is stored in the database.
- **Invented test addresses are skipped** (`@test.no`, `@example.com`, the `.test` TLD …) and
  count as a success. Staging shares the sending domain with production, so test users need a
  real mailbox or a `delivered+<label>@resend.dev` address.
- **Builders are pure.** Text and HTML come from one block list, so they cannot drift, and the
  HTML wrapper mirrors the Supabase templates.
- **No marketing content**, so no consent is needed. No promises about turnaround times.
- **Customer e-mails end with «Endre hvilke e-poster du får»** → `/dashboard/settings/emails`.

## Adding a customer e-mail

1. Builder in `src/lib/email/customer-emails.ts`, ending with `finishCustomer(...)`, plus a
   test in `customer-emails.test.ts`.
2. Sender in `src/lib/services/customer-emails.ts`: load with `getOrderForCustomerEmail`, build,
   `deliver(order, email, '<event>/<id>')`, inside a try/catch that only logs. Add it to the
   mock factories of the tests that mock this module.
3. Add the kind to `CUSTOMER_EMAIL_KINDS` in `src/lib/config/email-preferences.ts` and decide
   `optional`. For an optional kind, start the sender with `if (turnedOff(order, '<kind>')) return;`.
4. Call the sender after the database write it reports, never before, and `await` it.
5. Add a row to the tables in this file.

## Customer e-mails in detail

Transactional e-mails to customers (epic #32): Norwegian, sender `NooraCare <no-reply@nooracare.no>` with reply-to `COMPANY.email`, no marketing content (so no consent needed). One transport for the whole app: `sendEmail` in `lib/email/send.ts` (Resend REST via `fetch`, `RESEND_API_KEY`, no SDK). Builders are pure (`lib/email/customer-emails.ts`, `{ subject, text, html }` from one block list — the HTML wrapper mirrors `supabase/templates/`); `lib/services/customer-emails.ts` loads the order (`getOrderForCustomerEmail`) and payment (`getPaymentById`), builds and sends. The service functions **never throw and return void**: a failed e-mail is logged and must never fail the Vipps webhook or a server action. Idempotency is Resend's `Idempotency-Key` (`<event>/<entity id>`, 24 h) on top of the already guarded triggers — no `*_sent_at` columns, nothing stored in the DB; `https://resend.com/emails` is the delivery log.

**E-mail settings:** every customer e-mail ends with «Endre hvilke e-poster du får» → `/dashboard/settings/emails` (`finishCustomer` in `lib/email/customer-emails.ts`; the cleaner e-mails use `finish` and get no link). Five kinds can be turned off there and are then skipped by their sender (`turnedOff` → `wantsEmail`): cleaner confirmed, pickup reminder, picked up, delivered, and the evaluation e-mail (independent of the delivered e-mail). Order confirmation, price + receipt, payment failed, cancelled and new pickup date are always sent. A turned-off pickup reminder or evaluation e-mail counts as sent in its cron's answer.

| E-mail | Trigger (exact code path) | Key |
|---|---|---|
| Order confirmation (#23) | `generateFirstOrder` in the `agreement-activated` webhook, right after `createOrder` succeeds (subscription and one-time; the duplicate-delivery branch sends nothing). Pickup date + address, what the customer sends, the checkout figure as an «Estimat: ca. X kr» row (no explanatory text about the estimate — removed on purpose) — with a promo code three rows instead: «Estimat før rabatt», «Rabatt (KODE)» and «Estimat» after the discount (`estimateAfterPromo`), subscription frequency + cancel link (`/dashboard/subscription`) for subscriptions only (dormant while `SUBSCRIPTIONS_OFFERED` is false). Variant (#30): when the order is created `pending_assignment` the pickup date the customer chose still stands, so the e-mail is the same confirmation (same subject, title and «Dato» row) and only the intro adds that we are assigning a local cleaner, the customer does nothing and gets an e-mail when the cleaner is in place — no deadline, and never "the date is not confirmed" | `order-confirmation/<order.id>` |
| Price set + receipt (#26) | `markOrderReadyAndCharge` after `createChargeForCompletedOrder` returns (cleaner «Tøyet er klart til levering» → «Bekreft og belast», and the admin fallback «Marker som klar») and `retryChargeAction` for each re-charge; also for a 0-total promo order (no charge). Price lines from `calculateOrderPrice`, promo deduction, `pricing_notes` (the checkout estimate is not mentioned), Vipps charge id. Not sent when charge creation throws (`chargeFailed`) or when the charge is held by the price guard (`chargeHeld`) — in both cases the admin's «Belast på nytt» sends it | `price-receipt/<payment.id>` (`price-receipt/order-<order.id>` for 0-total) |
| Payment failed (#28) | `charge-failed` and `charge-creation-failed` webhooks after the payment row is marked `failed` (both handlers fail the row first). Copy states the retry policy: nothing to do, we re-charge within a few days («Belast på nytt»), we get in touch if that fails, delivery is unaffected | `payment-failed/<payment.id>` |
| Laundry delivered (#27) | `completeDeliveredOrder` (`lib/services/complete-order.ts`), last step after the guarded transition to `completed`, the rolling window and the agreement-stop check — cleaner «Levert til kunden», admin «Marker som levert», dormant driver delivery stop. Delivery date (`delivery_date`) + address, a payment line derived from the order's `payments` rows (nothing charged / captured / in flight; silent when the charge failed or does not exist), dormant subscription paragraph without a date. No evaluation link — that is its own e-mail the day after | `order-delivered/<order.id>` |
| Laundry picked up (#25) | `markOrderPickedUpAction` (cleaner «Jeg har hentet tøyet», shows the pickup time) and `adminMarkPickedUpAction` (admin fallback, no time), each right after the guarded `pickup_scheduled → in_cleaning` write succeeded. Names the cleaner by the whole `cleaners.display_name`, says the next e-mails are "price set" and "delivered" (no estimate text). No delivery date or deadline. The dormant driver flow sends nothing | `order-picked-up/<order.id>` |
| Pickup reminder (#24) | `GET /api/cron/pickup-reminders` (daily cron, 16:00 UTC) for every order in `pickup_scheduled` with `scheduled_date` = tomorrow (Oslo). Pickup date, time window (`PICKUP_TIME_RANGE`) and address, the customer's «Henteinstruksjoner» / «Vaskeinstruksjoner», the cleaner's `display_name`, button to the order page. Offers changing address, instructions and date — not cancellation (self-cancellation closed at midnight at the start of that day, `canCancelOrderSelf`) | `pickup-reminder/<order.id>/<scheduled_date>` |
| Evaluation | `GET /api/cron/evaluation-requests` (daily cron, 09:00 UTC) for every `completed` order with `delivery_date` = yesterday (Oslo) and no `order_evaluations` row. Delivery date, then the first question of the form («Hvor fornøyd er du med vasken totalt?») as five link buttons to `/evaluering/<order id>?satisfaction=<1–5>` — the click only pre-selects the answer, nothing is saved until the customer sends the form. The text says ca. 2 minutes while the customer still gets the first-time questions (`needsFullEvaluation`), otherwise under one minute. No «Se bestillingen» button | `evaluation-request/<order.id>` |
| Order cancelled (#29) | `cancelOrderAction` (customer, both exits: with and without "cancel the subscription too") and `cancelOrderAdminAction` (admin; the required `cancellation_reason` is printed as «Årsak»), after the cancel write and the subscription step. Says "ingenting er trukket … du blir ikke belastet" (true for every cancellable status) and nothing about the Vipps agreement (a one-time order's agreement is stopped silently right after the cancel write). Subscription orders only: next pickup date, or "abonnementet er sagt opp" | `order-cancelled/<order.id>` |
| New pickup date (#29) | `updateOrderPickupDateAction` (customer) and `updateOrderDetailsAction` (admin, only when `scheduled_date` changed — wording "Vi har endret …"), after the write. Old date → new date, address, «Henteinstruksjoner». Saving the same date sends nothing | `pickup-rescheduled/<order.id>/<orders.updated_at before the write>` — one key per real change, so A → B → A within 24 h is never swallowed |
| Cleaner confirmed (#30) | `assignCleanerAction` after `assignCleanerToOrder`, only when the order was `pending_assignment` before (never on a re-assignment between cleaners). Announces the cleaner («Renseren din er på plass»), not the pickup — that was already confirmed. Pickup date as stored after the assignment (the action never changes it), address, the cleaner's whole `display_name` (trimmed), link to the order page. Skipped when the order is no longer `pickup_scheduled` or its pickup date is already past. A cleaner decline sends nothing; the next assignment sends this e-mail again | `cleaner-confirmed/<order.id>/<number of declines>` |

Not sent (deliberately): other status changes (assignment, ready for delivery), `charge-captured` (the receipt went out at charge creation), the synchronous charge-creation failure inside `createChargeForCompletedOrder` (the admin's retry sends the price e-mail instead). `out_for_delivery` (dormant driver flow) sends nothing — the delivered e-mail goes out on `completed` only. Orders cancelled as a side effect of cancelling a whole subscription or of a Vipps-initiated agreement stop get no cancellation e-mail; address-only edits get no e-mail.

- **Env**: `RESEND_API_KEY` (missing → send skipped and logged), `NEXT_PUBLIC_APP_URL` (links). Staging sends real mail to the test accounts, through the same Resend account and sending domain as production — so test users must have a real mailbox or a `delivered+<label>@resend.dev` address (what the seed scripts create, `testEmail` in `scripts/lib/test-user-data.ts`). `sendEmail` skips invented addresses (`@test.no`, `@example.com`, …) instead of letting them bounce; Supabase Auth mails go through SMTP and are not covered by that guard.


## Staff e-mails in detail

E-mails to the cleaner and the admins about orders, and to the admins about new cleaners. Same architecture as the customer e-mails: pure builders (`lib/email/staff-emails.ts`), a service that **never throws and returns void** (`lib/services/staff-emails.ts`), the shared `sendEmail` transport, Resend `Idempotency-Key`, nothing stored in the DB. The cleaner mail is sent from `NooraCare <no-reply@nooracare.no>` with reply-to `COMPANY.email` to the cleaner's `users.email`; the admin mails are plain text from `ADMIN_DIGEST_FROM` (default `NooraCare <varsel@nooracare.no>`) to every `users` row with `role = 'admin'` and `deleted_at IS NULL` — the digest's recipients.

| E-mail | Trigger (exact code path) | Key |
|---|---|---|
| «Nytt oppdrag» (cleaner) | `sendCleanerNewOrderEmail` — `generateFirstOrder` in the `agreement-activated` webhook after `createOrder` (skipped inside when the order has no cleaner), `assignCleanerAction` after `assignCleanerToOrder` (first assignment and re-assignment), `declineCleanerOrder` after an automatic re-assignment, `sendCleanerPickupRescheduledEmails` when a customer reschedule handed the order to another cleaner. Pickup date, time window (`PICKUP_TIME_RANGE`), address, «Henteinstruksjoner», what the customer says they send (`customer_estimate`), button to `/dashboard/cleaner/<order id>`. No customer name, phone or e-mail. Skipped when the order is not `pickup_scheduled` | `cleaner-new-order/<order.id>/<cleaner_id>/<assigned_at>` — one per assignment, so A → B → A within 24 h is three e-mails |
| «Ny hentedato» (cleaner) | `sendCleanerPickupRescheduledEmails` — `updateOrderPickupDateAction` (customer) and `updateOrderDetailsAction` (admin, only when `scheduled_date` changed), after the write, when the same cleaner still holds the order. New date, previous date, time window, address, «Henteinstruksjoner», button to `/dashboard/cleaner/<order id>`. Skipped when the order had no cleaner, the date is unchanged or the order is not `pickup_scheduled` | `cleaner-pickup-rescheduled/<order.id>/<cleaner_id>/<orders.updated_at before the write>` — one key per real change, so A → B → A within 24 h is never swallowed |
| «Oppdraget er flyttet» (previous cleaner) | `sendCleanerPickupRescheduledEmails` — `updateOrderPickupDateAction`, when the customer moved the pickup to a weekday the cleaner does not work and the order went to another cleaner (who gets «Nytt oppdrag»). Order number and the previous pickup date; no address, no customer details, button to `/dashboard/cleaner` | `cleaner-order-moved/<order.id>/<previous cleaner_id>/<orders.updated_at before the write>` |
| «Ny ordre» (admins) | `sendAdminNewOrderEmail` — `generateFirstOrder`, same place, first orders only. Order number, city, pickup date, cleaner or «ingen renser ennå», link to `/admin/orders/<order id>` | `admin-new-order/<order.id>` |
| «Ordre venter på tildeling» (admins) | `sendAdminOrderUnassignedEmail` — `declineCleanerOrder` when the decline ended without a new cleaner (nobody available, pickup date already past, or the re-assignment failed). Who declined, city, pickup date, number of declines, link. Skipped when the order is no longer `pending_assignment` | `admin-order-unassigned/<order.id>/<number of declines>` |
| «Ny renser venter på godkjenning» (admins) | `sendAdminNewCleanerEmail` — `createCleanerProfileAction` right after the `cleaners` row is inserted (`verification_status = 'pending'`). Display name, full name, base city, private person or business, link to `/admin/cleaners/<cleaner id>`. No tax id, bank account, address or contact details | `admin-new-cleaner/<cleaner.id>` |

Not sent (deliberately): nothing to the cleaner who loses an order on an admin re-assignment; nothing for rolling-window subscription orders (dormant); no admin alert for an order created without a cleaner beyond the «ingen renser ennå» in «Ny ordre». A decline or an automatic re-assignment sends the customer nothing.

- **Env**: `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, optional `ADMIN_DIGEST_FROM` (see `ENVIRONMENTS.md`). Unlike the digest (a Production-only cron) these are sent from every environment that has `RESEND_API_KEY`, so staging test orders e-mail the staging admin users.


## Pickup reminders

Every day at 16:00 UTC (17:00 in Oslo in winter, 18:00 in summer) a Vercel cron (`vercel.json` → `crons`, Production only) calls `GET /api/cron/pickup-reminders` with `Authorization: Bearer $CRON_SECRET`. The route loads the orders in `pickup_scheduled` whose `scheduled_date` is tomorrow in the Oslo calendar (`tomorrowInOslo` → `getOrdersForPickupReminder`) and sends each customer the "sett posen klar" e-mail (`sendPickupReminderEmail` → `buildPickupReminderEmail`, see Customer e-mails in detail). `pending_assignment` orders get nothing. Sends are sequential; one failure never stops the batch. The route answers `{ date, sent, failed }` — 200 when nothing failed, 502 when something did (Vercel does not retry crons; the code only makes the failure visible in the logs).

- **Re-runs are safe**: the Resend `Idempotency-Key` is `pickup-reminder/<order.id>/<scheduled_date>` (kept 24 h; the cron runs once a day). Calling the route again the same evening re-sends nothing and retries what failed; a rescheduled order gets a reminder for its new date. Nothing is stored in the DB.
- **No catch-up**: if the cron does not run on an evening, those customers get no reminder unless someone calls the route by hand before midnight Oslo time.
- **Env**: `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL` (see `ENVIRONMENTS.md`).


## Evaluation requests

Every day at 09:00 UTC (10:00 in Oslo in winter, 11:00 in summer) a Vercel cron (`vercel.json` → `crons`, Production only) calls `GET /api/cron/evaluation-requests` with `Authorization: Bearer $CRON_SECRET`. The route loads the `completed` orders whose `delivery_date` is yesterday in the Oslo calendar (`yesterdayInOslo` → `getOrdersDeliveredOn`), drops the ones that already have an evaluation (`getEvaluatedOrderIds`) and sends each remaining customer «Hvordan var vasken?» (`sendEvaluationRequestEmail` → `buildEvaluationRequestEmail`, see Customer e-mails in detail). Sends are sequential; one failure never stops the batch. The route answers `{ date, sent, skipped, failed }` — 200 when nothing failed, 502 when something did.

- **The score buttons never save anything**: mail scanners follow links, so `/evaluering/<order id>?satisfaction=<n>` only pre-selects the first answer (`prefilledSatisfaction`); the answer set is stored when the customer presses «Send svar».
- **Re-runs are safe**: the Resend `Idempotency-Key` is `evaluation-request/<order.id>` (kept 24 h; the cron runs once a day and an order matches the date filter on one day only). Nothing is stored in the DB.
- **No catch-up**: if the cron does not run on a day, the orders delivered the day before get no evaluation e-mail unless someone calls the route by hand before midnight Oslo time.
- **Env**: `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL` (see `ENVIRONMENTS.md`).

## Admin digest

Every day at 06:00 UTC a Vercel cron (`vercel.json` → `crons`, Production only) calls `GET /api/cron/admin-digest` with `Authorization: Bearer $CRON_SECRET`. The route e-mails the same lists `/admin` shows (`lib/database/admin-attention.ts` → `lib/services/admin-digest.ts`) as plain text to every `users` row with `role = 'admin'` and `deleted_at IS NULL`, through the shared `sendEmail` transport (`lib/email/send.ts` — Resend REST API with `fetch`, no SDK). It is sent even when there is nothing to do, so a missing e-mail means the cron or sender is broken. Instant alerts for failures are separate — see `CLAUDE.md` → Error Alerts. The two order alerts to admins («Ny ordre», «Ordre venter på tildeling») are separate — see Staff e-mails in detail.

- **One message per admin** (`sendToAdmins` in `lib/email/admin-mail.ts`), for the digest, the order alerts and the error alerts alike: with every admin on one message, a single bouncing address makes Resend suppress it for all. The digest route answers 502 `{ sent, failed }` when any admin's copy is rejected. Every admin account needs a working mailbox — a bounce also hurts the sending domain.
- **Env**: `CRON_SECRET`, `RESEND_API_KEY`, optional `ADMIN_DIGEST_FROM` (see `ENVIRONMENTS.md`). The `nooracare.no` sending domain is verified in Resend (shared with the Auth e-mails).
