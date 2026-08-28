# TODO

Outstanding tasks for NooraCare. Check items off as they're done; add new ones at the appropriate section.

## Before production launch

- [ ] Replace placeholder legal entity name and 9-digit org number ([Footer.tsx](src/components/landing/Footer.tsx), [kontakt](src/app/kontakt/page.tsx))
- [ ] Replace placeholder phone number ([Footer.tsx](src/components/landing/Footer.tsx), [kontakt](src/app/kontakt/page.tsx), [personvern](src/app/personvern/page.tsx), [personvern-renser](src/app/personvern-renser/page.tsx), [salgsvilkar](src/app/salgsvilkar/page.tsx))
- [ ] Replace placeholder postal address (same pages as above — keep in sync with Footer.tsx)
- [ ] Point the footer social links (Instagram/Facebook) at real profiles — currently `href="#"`

## Bugs & schema notes

- [ ] Aborting Vipps checkout leads to the SUCCESS page
- [ ] Subscription status is `payment_pending` right after creation — this is wrong
- [ ] Choosing a simple (one-time) order stores `Monthly` frequency in the DB
- [ ] Make `frequency` an enum in the DB
- [ ] Consider removing `payment_type` from Payment — all payments should be tracked, and `subscription_id` already tells whether a payment belongs to a subscription

## Payments & webhooks

- [ ] Send customer notification when a recurring charge fails ([route.ts:433](src/app/api/webhooks/vipps/recurring/route.ts:433))
- [ ] Handle retry logic or pause subscription after repeated failed payments ([route.ts:434](src/app/api/webhooks/vipps/recurring/route.ts:434))
- [ ] Send admin notification on charge creation failure ([route.ts:459](src/app/api/webhooks/vipps/recurring/route.ts:459))
- [ ] Consider reversing subscription/order status when the initial payment is refunded ([route.ts:394](src/app/api/webhooks/vipps/recurring/route.ts:394))
- [ ] Send admin notification when next-order generation fails after completion ([completion-actions.ts:37](src/app/admin/orders/completion-actions.ts:37))

## Code quality

- [ ] Refactor the 11 `setState`-in-effect / hooks patterns flagged by react-hooks v7, then re-enable the `react-hooks/set-state-in-effect` and `react-hooks/immutability` rules in [eslint.config.mjs](eslint.config.mjs) (admin orders, bli-renser steps, orders pickup/success, use-mobile)

## Dependency upgrades (deferred 2026-08-28)

- [ ] Upgrade eslint 9 → 10 once eslint-config-next's plugins (eslint-plugin-react) support it
- [ ] Evaluate TypeScript 5.9 → 7 (native compiler) once the ecosystem settles
