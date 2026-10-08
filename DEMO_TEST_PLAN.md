# Demo smoke test plan

Run this the evening before and again ~1 hour before the demo. Use **staging** (`test.nooracare.no`, Vipps test) unless you intend to show production. Tick each box; anything unticked is a go/no-go item.

## 0. Pre-flight (10 min, no browser needed)

- [ ] `develop` is the branch you want to show. Latest GitHub Actions run for `staging.yaml` is green.
- [ ] Vercel preview for `develop` is green and `test.nooracare.no` serves it (check the footer/latest change is visible).
- [ ] Vipps webhook is registered for staging: `npm run webhooks -- list` shows `https://test.nooracare.no/api/webhooks/vipps/recurring` with all `recurring.*` events.
- [ ] Vipps MT test app is installed on your phone and logged in with a test user (get one from the Vipps test portal if needed).
- [ ] `npm test` and `npm run lint` pass locally on `develop`.

## 1. Accounts you need (prepare tonight)

| Role | Account | Notes |
|------|---------|-------|
| Customer | a **fresh** email you control | Signing up live is part of the demo. Have a second fresh email as backup. |
| Cleaner | approved, `is_accepting_orders = true`, base city = demo city, weekly schedule includes the pickup weekday | Check in `/admin/cleaners`. If none, run `npm run seed:test-users -- --count=2 --city=Bergen` against staging and activate one. |
| Driver | a driver in the same city | `/admin/drivers` |
| Admin | your admin login | |

Keep four browser profiles/windows open (customer, cleaner, driver, admin) so you never log out mid-demo.

## 2. Public pages (5 min)

- [ ] `/` loads, no console errors, CTA leads to `/orders/wash`.
- [ ] `/pris-kalkulator` calculates and the estimate matches what step 1 of checkout shows.
- [ ] `/bli-renser`, `/kontakt`, `/salgsvilkar`, `/personvern`, `/personvern-renser` all render.
- [ ] A random URL (`/foo`) shows the Norwegian 404 page.
- [ ] Check on a phone-width viewport: no horizontal scroll on the landing page and checkout.

## 3. Customer signup and checkout (the main demo path)

- [ ] `/auth/signup` with the fresh email. Confirmation email arrives, link lands on the dashboard (not `/auth/error`).
- [ ] Signing up again with the same phone/email shows the clear Norwegian duplicate error.
- [ ] `/orders/wash`: pick bags + bedding + ironing. Estimate updates live.
- [ ] `/orders/pickup`: address in the demo city, **pickup date at least 2 days out** (needed so the cancel button appears later), frequency = weekly.
- [ ] `/orders/confirm`: summary matches. Enter a promo code (create a fresh one in `/admin/promo-codes` for the demo; it can only be redeemed once per customer). Invalid code shows an inline error.
- [ ] Click pay: redirected to Vipps test, approve in the MT app.
- [ ] `/orders/success` polls and flips to "active" within ~10 s. If it hangs, the webhook did not arrive: check Vercel logs for `/api/webhooks/vipps/recurring`.
- [ ] `/dashboard`: subscription strip visible, first order listed with status "pickup scheduled", cleaner assigned, delivery shown as "Estimert levering".
- [ ] `/orders/details/[orderId]` shows address, date, estimate and the promo line.

Also test the abandoned checkout once: start checkout, cancel in Vipps. Dashboard should show the "betalingen ble ikke fullført" warning, and a new checkout must succeed afterwards.

## 4. Admin view of the new order

- [ ] `/admin` overview counts went up by one order.
- [ ] `/admin/orders` lists it; detail page shows the assigned cleaner and the promo snapshot.
- [ ] Reassign to another cleaner and back (proves the reassignment action works).
- [ ] `/admin/customers/[id]` shows the new customer and their subscription.
- [ ] `/admin/payments` has **no** payment yet (price is set by the cleaner).

## 5. Driver: pickup leg

Log in as the driver (or admin) on `/dashboard/driver`.

- [ ] The order shows on the route for the pickup date. Route summary and map/geocoding look right (no missing coordinates warning).
- [ ] Mark picked up → status `picked_up`.
- [ ] Mark delivered to cleaner → status `in_cleaning`.
- [ ] Customer dashboard reflects each step after refresh.

## 6. Cleaner: price and mark ready (creates the Vipps charge)

Log in as the cleaner on `/dashboard/cleaner`.

- [ ] The mission is in the list; `/dashboard/cleaner/[orderId]` opens.
- [ ] "Mark ready" is blocked until wash details are registered (try it first, expect the error).
- [ ] Register wash loads, ironing groups, weight and notes. Price shows the 500 kr minimum when the load is small, and the promo discount comes off after that.
- [ ] Mark ready for delivery → status `ready_for_delivery`.
- [ ] Within ~10 s: `/admin/payments` shows a captured payment for the discounted amount, and the Vipps MT app shows the charge.
- [ ] Bonus: a 100 % promo code order completes with no payment row at all.

## 7. Driver: delivery leg and rolling window

- [ ] `/dashboard/driver`: the order is now on the collection route (it does not wait for the estimated delivery date).
- [ ] Mark collected → `out_for_delivery`; mark delivered → `completed`.
- [ ] Customer dashboard: completed order in history, **a new upcoming order** exists 7 days after the first pickup with the same cleaner and **no** promo.
- [ ] Admin overview counts updated.

## 8. Cancellation and reschedule

- [ ] On the new upcoming order: `/orders/[orderId]/reschedule` to a later date. Cleaner stays the same, order still shows in the cleaner list.
- [ ] `/orders/[orderId]/cancel` → "cancel this order only". A replacement order is generated immediately.
- [ ] Set a pickup date within 24 h (admin edit) and confirm the cancel button disappears with the notice.
- [ ] `/dashboard/subscription` → cancel. Upcoming order is cancelled, subscription shows cancelled, Vipps agreement stopped in the MT app. Dashboard offers a new checkout.
- [ ] Optional: cancel the agreement from the Vipps app instead and confirm the webhook cancels the subscription.

## 9. Cleaner onboarding (if you will show it)

- [ ] `/bli-renser/signup` with a fresh email → confirmation → steps 1–5 in order. Jumping ahead by URL sends you back to the right step.
- [ ] Step 1 rejects a tax id already in use.
- [ ] Confirm → `/bli-renser/success`. Cleaner appears in `/admin/cleaners` as pending; activate it; the cleaner can now log in to `/dashboard/cleaner`.

## 10. Role guards (2 min)

- [ ] Customer visiting `/admin`, `/dashboard/cleaner`, `/dashboard/driver` is redirected or gets 404, not a crash.
- [ ] Logged-out visit to `/dashboard` goes to `/auth/login`.
- [ ] Logout works from every role.

## Demo-day hygiene

- Do the full path (sections 3–7) once tonight so the demo data already exists, then keep a **second fresh customer** for the live run.
- Do not open `/prototype` in the demo; it is mock-only.
- Pickup dates: the DB rejects dates in the past, and cancel needs > 24 h notice, so always pick 2+ days out.
- If Vipps is slow, the fallback is to show the admin order detail and the cleaner dashboard on pre-created data.
- After testing, delete the throwaway customers in the Supabase staging dashboard if you want clean admin counts.

## Go / no-go

Go if sections 0, 3, 5, 6, 7 are fully green. Sections 8–10 can fail on minor points and still be demoed around.
