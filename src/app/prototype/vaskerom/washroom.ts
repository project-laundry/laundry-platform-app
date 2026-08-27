// ─────────────────────────────────────────────────────────────────────────────
// Washroom model — PURE (no React, no I/O).
//
// Order-centric flow. The unit of work is an ORDER, not a floating wash load:
//   Mottatt  → cleaner has the bag; contents are prefilled from what the
//              customer ordered, and the cleaner edits them to match reality.
//   I arbeid → cleaner has started; still editable.
//   Klar     → cleaner confirmed the work, which triggers the Vipps charge;
//              the order is now ready to be picked up.
//
// "Registering" is no longer a separate screen — it's the editable `registered`
// contents on each order, confirmed at the Mottatt/I arbeid → Klar transition.
// In the real version an order maps to `orders`; `registered` is the line items
// the cleaner prices (total_cost_ore) before the Recurring API charge is created.
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus = 'mottatt' | 'arbeid' | 'klar';

// What was washed / pressed. Wash counts are machine loads; iron counts are
// pieces (everyday vs formal mirror the customer order flow, which prices them
// apart) plus bedding sets.
export interface OrderContents {
  washClothes: number;
  washBedding: number;
  ironEveryday: number;
  ironFormal: number;
  ironBedding: number;
}

export type ContentField = keyof OrderContents;

export interface WashOrder {
  id: string;
  order_number: string;
  customer_name: string;
  notes: string | null;
  requested: OrderContents; // what the customer prefilled (the seed + reference)
  registered: OrderContents; // what the cleaner confirms — seeded from `requested`, editable
  status: OrderStatus;
  charged_at: string | null; // HH:MM stamped when confirmed → charged (status klar)
  promo?: OrderPromo | null; // first-order discount, if any (platform-absorbed)
}

export interface FieldCfg {
  id: ContentField;
  label: string;
  hint: string;
}

// Editor fields, split into the two things the cleaner registers. Hints describe
// the unit (not a price) — the kr total is intentionally kept off this screen.
export const WASH_FIELDS: FieldCfg[] = [
  { id: 'washClothes', label: 'Klesvask', hint: 'Per maskin' },
  { id: 'washBedding', label: 'Sengetøy', hint: 'Egen vask' },
];

export const IRON_FIELDS: FieldCfg[] = [
  { id: 'ironEveryday', label: 'Vanlige plagg', hint: 'T-skjorter, bukser o.l.' },
  { id: 'ironFormal', label: 'Skjorter & kjoler', hint: 'Dresser, finkjoler o.l.' },
  { id: 'ironBedding', label: 'Sengetøy', hint: 'Laken & dynetrekk' },
];

export const ALL_FIELDS: FieldCfg[] = [...WASH_FIELDS, ...IRON_FIELDS];

export interface StatusCfg {
  key: OrderStatus;
  label: string;
}

export const STATUSES: StatusCfg[] = [
  { key: 'mottatt', label: 'Mottatt' },
  { key: 'arbeid', label: 'I arbeid' },
  { key: 'klar', label: 'Klar til henting' },
];

/** Forward transition for each status (null = terminal). */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  mottatt: 'arbeid',
  arbeid: 'klar',
  klar: null,
};

/** Label for the button that advances an order out of its current status. */
export const ADVANCE_LABEL: Record<OrderStatus, string> = {
  mottatt: 'Start arbeid',
  arbeid: 'Fullfør og belast',
  klar: '',
};

export function washLoadCount(c: OrderContents): number {
  return c.washClothes + c.washBedding;
}

export function ironPieceCount(c: OrderContents): number {
  return c.ironEveryday + c.ironFormal + c.ironBedding;
}

export function contentTotal(c: OrderContents): number {
  return washLoadCount(c) + ironPieceCount(c);
}

/** Short one-liner for the collapsed order card, e.g. "2 vaskelaster · 5 stryk". */
export function contentSummary(c: OrderContents): string {
  const parts: string[] = [];
  const wash = washLoadCount(c);
  const iron = ironPieceCount(c);
  if (wash > 0) parts.push(`${wash} ${wash === 1 ? 'vaskelast' : 'vaskelaster'}`);
  if (iron > 0) parts.push(`${iron} stryk`);
  return parts.length ? parts.join(' · ') : 'Ingen registrering ennå';
}

export function contentsEqual(a: OrderContents, b: OrderContents): boolean {
  return (
    a.washClothes === b.washClothes &&
    a.washBedding === b.washBedding &&
    a.ironEveryday === b.ironEveryday &&
    a.ironFormal === b.ironFormal &&
    a.ironBedding === b.ironBedding
  );
}

export function ordersByStatus(orders: WashOrder[], status: OrderStatus): WashOrder[] {
  return orders.filter((o) => o.status === status);
}
