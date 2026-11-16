// Pre-launch promises shown on both coming-soon pages. Keep them in one place
// so the hero badge, the waitlist offer and the social images agree.

/** When we open, as it reads after "Åpner i Bergen og Oslo …". Update as the
 *  plan firms up ("i vinter", "i januar", "1. februar"). */
export const LAUNCH_WINDOW_LABEL = 'i vinter';

/** Cap on the waitlist launch offer (first wash at half price). At launch this
 *  maps to a promo code e-mailed to the rows with
 *  `waitlist_signups.offer_eligible = true` — a database trigger sets that on
 *  the first N customer signups, and the same N is hard-coded in the trigger
 *  (supabase/migrations/20261019120000_add_waitlist_offer_eligible.sql);
 *  change both together. See BUSINESS_LOGIC.md "Pre-launch Waitlist". */
export const WAITLIST_OFFER_SPOTS = 50;
