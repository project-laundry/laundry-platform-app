import { config } from 'dotenv';
import { resolve } from 'path';
import { createAdminClient } from './lib/admin-client';
import { calculateOrderPrice } from '../src/lib/config/pricing';
import { generateOrderNumber } from '../src/lib/utils/order-number';

config({ path: resolve(__dirname, '../.env.local') });

// Gives one existing cleaner a realistic order history: completed orders in the
// previous and current month (payout/earnings), orders in progress, upcoming
// pickups and an open mission. Re-running replaces the previously seeded orders.
//
//   npm run seed:cleaner-orders -- --email=cleaner@example.com


const CUSTOMERS = [
  { email: 'seed.kunde1@test.no', phone: '+4740000001', name: 'Mari Solberg', street: 'Bogstadveien 27', postal: '0355', lat: 59.9235, lon: 10.7203 },
  { email: 'seed.kunde2@test.no', phone: '+4740000002', name: 'Jonas Berg', street: 'Thorvald Meyers gate 41', postal: '0555', lat: 59.9232, lon: 10.7589 },
  { email: 'seed.kunde3@test.no', phone: '+4740000003', name: 'Sara Haugen', street: 'Storgata 22', postal: '0184', lat: 59.9158, lon: 10.7486 },
  { email: 'seed.kunde4@test.no', phone: '+4740000004', name: 'Henrik Dahl', street: 'Sofienberggata 12', postal: '0558', lat: 59.9211, lon: 10.7644 },
];

type SeedStatus =
  | 'completed'
  | 'cancelled'
  | 'out_for_delivery'
  | 'ready_for_delivery'
  | 'in_cleaning'
  | 'picked_up'
  | 'pickup_scheduled'
  | 'pending_assignment';

interface SeedOrder {
  status: SeedStatus;
  /** Pickup date, in days from today (negative = past). */
  pickupDayOffset: number;
  customer: number;
  bags: number;
  washLoads: number;
  note?: string;
}

const ORDERS: SeedOrder[] = [
  // Previous month
  { status: 'completed', pickupDayOffset: -45, customer: 0, bags: 2, washLoads: 2 },
  { status: 'completed', pickupDayOffset: -40, customer: 1, bags: 3, washLoads: 3, note: 'Ring på døren, 3. etasje' },
  { status: 'completed', pickupDayOffset: -34, customer: 2, bags: 2, washLoads: 2 },
  { status: 'completed', pickupDayOffset: -30, customer: 3, bags: 4, washLoads: 4 },
  { status: 'cancelled', pickupDayOffset: -28, customer: 1, bags: 2, washLoads: 0 },
  // This month
  { status: 'completed', pickupDayOffset: -18, customer: 0, bags: 3, washLoads: 3 },
  { status: 'completed', pickupDayOffset: -12, customer: 2, bags: 2, washLoads: 2 },
  { status: 'completed', pickupDayOffset: -8, customer: 1, bags: 5, washLoads: 5, note: 'Nøkkelboks ved inngangen' },
  // In progress
  { status: 'out_for_delivery', pickupDayOffset: -4, customer: 3, bags: 2, washLoads: 2 },
  { status: 'ready_for_delivery', pickupDayOffset: -3, customer: 0, bags: 3, washLoads: 3 },
  { status: 'in_cleaning', pickupDayOffset: -2, customer: 2, bags: 2, washLoads: 2 },
  { status: 'picked_up', pickupDayOffset: -1, customer: 1, bags: 2, washLoads: 0 },
  // Upcoming
  { status: 'pickup_scheduled', pickupDayOffset: 1, customer: 3, bags: 3, washLoads: 0, note: 'Hentes etter kl. 16' },
  { status: 'pickup_scheduled', pickupDayOffset: 3, customer: 0, bags: 2, washLoads: 0 },
  { status: 'pickup_scheduled', pickupDayOffset: 6, customer: 2, bags: 4, washLoads: 0 },
  // Open mission (no cleaner yet) in the cleaner's city
  { status: 'pending_assignment', pickupDayOffset: 4, customer: 1, bags: 2, washLoads: 0 },
];

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function at(offsetDays: number, hour: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  const emailArg = process.argv.slice(2).find((a) => a.startsWith('--email='));
  const email = emailArg?.split('=')[1];
  if (!email) {
    console.error('❌ Missing --email=<cleaner e-mail>');
    process.exit(1);
  }

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();
  if (!user || user.role !== 'cleaner') {
    console.error(`❌ No cleaner user with e-mail ${email}`);
    process.exit(1);
  }
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('id, display_name, base_city')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!cleaner) {
    console.error('❌ User has no cleaner profile');
    process.exit(1);
  }
  console.log(`🧼 Cleaner: ${cleaner.display_name} (${cleaner.base_city})`);

  // Remove orders from an earlier run (payments first — they reference orders).
  const marker = `seed:${cleaner.id}`;
  const { data: old } = await supabase.from('orders').select('id').eq('admin_notes', marker);
  if (old && old.length > 0) {
    const ids = old.map((o) => o.id);
    await supabase.from('payments').delete().in('order_id', ids);
    await supabase.from('orders').delete().in('id', ids);
    console.log(`♻️  Removed ${ids.length} previously seeded orders`);
  }

  // Customers: reuse by e-mail, otherwise create.
  const customerIds: string[] = [];
  for (const c of CUSTOMERS) {
    let { data: existing } = await supabase.from('users').select('id').eq('email', c.email).maybeSingle();
    if (!existing) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: c.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { full_name: c.name, phone: c.phone },
      });
      if (error || !created.user) throw error ?? new Error('createUser failed');
      await new Promise((r) => setTimeout(r, 500)); // handle_new_user trigger
      existing = { id: created.user.id };
    }
    let { data: customer } = await supabase.from('customers').select('id').eq('user_id', existing.id).maybeSingle();
    if (!customer) {
      const { data: inserted, error } = await supabase.from('customers').insert({ user_id: existing.id }).select('id').single();
      if (error || !inserted) throw error ?? new Error('customer insert failed');
      customer = inserted;
    }
    customerIds.push(customer.id);
  }

  for (const o of ORDERS) {
    const c = CUSTOMERS[o.customer];
    const pickedUp = !['pending_assignment', 'pickup_scheduled'].includes(o.status) && o.status !== 'cancelled';
    const priced = ['completed', 'out_for_delivery', 'ready_for_delivery'].includes(o.status);
    const price = priced ? calculateOrderPrice({ wash_loads: o.washLoads, ironing_details: null }) : null;
    const assigned = o.status !== 'pending_assignment';
    const base = o.pickupDayOffset;

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: generateOrderNumber(),
        admin_notes: marker,
        customer_id: customerIds[o.customer],
        cleaner_id: assigned ? cleaner.id : null,
        status: o.status,
        street: c.street,
        postal_code: c.postal,
        city: 'Oslo',
        country: 'Norway',
        latitude: c.lat,
        longitude: c.lon,
        special_instructions: o.note ?? null,
        scheduled_date: isoDate(base),
        delivery_date: isoDate(base + 3),
        needs_ironing: false,
        customer_estimate: {
          bags: o.bags,
          bedding_sets: 0,
          iron_everyday_items: false,
          iron_formal_items: false,
          iron_bedding: false,
          estimated_total_ore: calculateOrderPrice({ wash_loads: Math.ceil(o.bags / 2), ironing_details: null }).total_ore,
        },
        assigned_at: assigned ? at(base - 2, 9) : null,
        mission_accepted_at: assigned ? at(base - 2, 10) : null,
        picked_up_at: pickedUp ? at(base, 15) : null,
        in_cleaning_at: pickedUp && o.status !== 'picked_up' ? at(base, 17) : null,
        ready_for_delivery_at: priced ? at(base + 1, 12) : null,
        out_for_delivery_at: ['completed', 'out_for_delivery'].includes(o.status) ? at(base + 2, 10) : null,
        completed_at: o.status === 'completed' ? at(base + 2, 14) : null,
        cancelled_at: o.status === 'cancelled' ? at(base - 1, 11) : null,
        cancellation_reason: o.status === 'cancelled' ? 'Kunden avbestilte' : null,
        wash_loads: o.washLoads,
        actual_weight_kg: priced ? o.washLoads * 4.5 : null,
        total_cost_ore: price?.total_ore ?? null,
        cleaner_payout_ore: price?.cleaner_payout_ore ?? null,
        price_calculated_at: priced ? at(base + 1, 12) : null,
      })
      .select('id, order_number, total_cost_ore, customer_id')
      .single();
    if (error || !order) throw error ?? new Error('order insert failed');

    if (order.total_cost_ore !== null && ['completed', 'out_for_delivery', 'ready_for_delivery'].includes(o.status)) {
      const { error: payError } = await supabase.from('payments').insert({
        customer_id: order.customer_id,
        order_id: order.id,
        payment_type: 'one_time',
        amount_ore: order.total_cost_ore,
        status: 'captured',
        payment_provider: 'manual',
        captured_at: at(base + 1, 12),
      });
      if (payError) throw payError;
    }
    console.log(`  ✅ ${order.order_number}  ${o.status.padEnd(18)} ${isoDate(base)}`);
  }

  console.log('\n✨ Done. Log in as the cleaner to see the data.');
}

main().catch((e) => {
  console.error('💥', e);
  process.exit(1);
});
