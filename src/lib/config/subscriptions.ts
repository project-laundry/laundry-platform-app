/** Recurring pickups ("fast henting" / abonnement) are not offered in the
 *  first version — customers place one-time orders only (BUSINESS_LOGIC.md
 *  "Subscriptions (not in the first version)"). All subscription code is kept.
 *  Flip this to `true` when subscriptions ship: it un-hides the frequency
 *  choice in the order flow, the subscription wording on the customer, legal
 *  and admin pages, and lets `createSubscriptionAction` create subscriptions
 *  again.
 *
 *  Typed as `boolean` (not the literal `false`) on purpose, so TypeScript never
 *  narrows code behind the flag to "unreachable". */
export const SUBSCRIPTIONS_OFFERED: boolean = false;
