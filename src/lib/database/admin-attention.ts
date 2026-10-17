// Everything an admin must look at: due today, overdue, waiting, and payments
// or activations that went wrong. The one data source for the admin overview
// (app/admin/page.tsx) and the daily digest e-mail
// (app/api/cron/admin-digest/route.ts).
//
// A failed query is reported as `null`, never as an empty list: an empty list
// means "nothing to do", null means "we don't know", and they must look
// different to the admin.

import { createAdminClient } from '@/lib/supabase/admin';
import { todayInOslo } from '@/lib/utils/date';
import {
  STALE_PENDING_DAYS,
  orphanPendingCutoffIso,
  stalePendingCutoffIso,
} from '@/lib/utils/payment-status';
import type { OrderStatus, PaymentStatus, SubscriptionFrequency } from '@/types/database';

/** A `ready_for_delivery` order older than this is flagged as sitting too long. */
export const READY_TOO_LONG_DAYS = 2;

/**
 * An activated agreement or subscription may be seconds away from getting its
 * first order (the activation webhook creates it). Only flag "no order" after
 * this grace period.
 */
export const ACTIVATION_GRACE_MINUTES = 15;

/** Cap per list. The overview is a work queue, not a report. */
const LIST_LIMIT = 100;

const NOT_PICKED_UP: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
const PICKED_UP_NOT_DELIVERED: OrderStatus[] = [
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
];
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [...NOT_PICKED_UP, ...PICKED_UP_NOT_DELIVERED];

const CUSTOMER_NAME_SELECT = 'customer:customers!customer_id(user:users!user_id(full_name))';

const ORDER_SELECT = `
  id, order_number, status, scheduled_date, delivery_date, city, created_at, ready_for_delivery_at,
  ${CUSTOMER_NAME_SELECT},
  cleaner:cleaners!orders_cleaner_id_fkey(id, display_name)
`;

const PAYMENT_SELECT = `
  id, status, amount_ore, provider_reference, failure_reason, created_at,
  ${CUSTOMER_NAME_SELECT},
  order:orders!order_id(id, order_number)
`;

export interface AttentionOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  scheduled_date: string;
  delivery_date: string;
  city: string;
  created_at: string;
  ready_for_delivery_at: string | null;
  customer: { user: { full_name: string } };
  cleaner: { id: string; display_name: string } | null;
}

export interface AttentionPayment {
  id: string;
  status: PaymentStatus;
  amount_ore: number;
  provider_reference: string | null;
  failure_reason: string | null;
  created_at: string;
  customer: { user: { full_name: string } };
  order: { id: string; order_number: string } | null;
}

export interface AttentionSubscription {
  id: string;
  customer_id: string;
  frequency: SubscriptionFrequency;
  started_at: string | null;
  customer: { user: { full_name: string } };
  /** Non-terminal orders of the subscription (filtered in the query); empty = the problem. */
  orders: { id: string }[];
}

export interface AttentionAgreement {
  id: string;
  customer_id: string;
  provider_agreement_id: string;
  activated_at: string | null;
  customer: { user: { full_name: string } };
  /** Orders carrying this payment_agreement_id; empty = the problem. */
  orders: { id: string }[];
}

/** Every list is `null` when its query failed. */
export interface AdminAttention {
  /** YYYY-MM-DD in Europe/Oslo that "today" means below. */
  today: string;
  pickupsToday: AttentionOrder[] | null;
  deliveriesToday: AttentionOrder[] | null;
  overduePickups: AttentionOrder[] | null;
  readyTooLong: AttentionOrder[] | null;
  pendingAssignment: AttentionOrder[] | null;
  paymentsToFollowUp: AttentionPayment[] | null;
  subscriptionsWithoutOrder: AttentionSubscription[] | null;
  agreementsWithoutOrder: AttentionAgreement[] | null;
}

function rows<T>(result: { data: unknown; error: unknown }, label: string): T[] | null {
  if (result.error) {
    console.error(`[Admin Attention] ${label} query failed:`, result.error);
    return null;
  }
  return (result.data ?? []) as T[];
}

/**
 * Why a payment is in the follow-up list, in Norwegian. Shared by the
 * overview row and the digest line.
 */
export function paymentIssueLabel(
  payment: Pick<AttentionPayment, 'status' | 'provider_reference' | 'failure_reason'>
): string {
  if (payment.status === 'failed') {
    return payment.failure_reason ? `Feilet: ${payment.failure_reason}` : 'Feilet';
  }
  if (payment.provider_reference === null) {
    return 'Belastningen ble aldri opprettet hos Vipps';
  }
  return `Venter på Vipps i over ${STALE_PENDING_DAYS} dager`;
}

/**
 * Runs the eight queries in parallel. The order of the array below is fixed
 * and the unit test depends on it (it feeds results back in this order).
 */
export async function getAdminAttention(now: Date = new Date()): Promise<AdminAttention> {
  const supabase = createAdminClient();
  const today = todayInOslo(now);
  const readyCutoff = new Date(now.getTime() - READY_TOO_LONG_DAYS * 86_400_000).toISOString();
  const activationCutoff = new Date(
    now.getTime() - ACTIVATION_GRACE_MINUTES * 60_000
  ).toISOString();

  const [
    pickupsToday,
    deliveriesToday,
    overduePickups,
    readyTooLong,
    pendingAssignment,
    payments,
    subscriptions,
    agreements,
  ] = await Promise.all([
    // 1. Pickups due today, not yet picked up.
    supabase
      .from('orders')
      .select(ORDER_SELECT)
      .in('status', NOT_PICKED_UP)
      .eq('scheduled_date', today)
      .order('order_number', { ascending: true })
      .limit(LIST_LIMIT),
    // 2. Estimated deliveries today (informational — delivery_date is an estimate).
    supabase
      .from('orders')
      .select(ORDER_SELECT)
      .in('status', PICKED_UP_NOT_DELIVERED)
      .eq('delivery_date', today)
      .order('order_number', { ascending: true })
      .limit(LIST_LIMIT),
    // 3. Pickup date passed, still not picked up.
    supabase
      .from('orders')
      .select(ORDER_SELECT)
      .in('status', NOT_PICKED_UP)
      .lt('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(LIST_LIMIT),
    // 4. Ready for delivery for more than READY_TOO_LONG_DAYS (updated_at when
    //    the status timestamp is missing).
    supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('status', 'ready_for_delivery')
      .or(
        `ready_for_delivery_at.lt.${readyCutoff},and(ready_for_delivery_at.is.null,updated_at.lt.${readyCutoff})`
      )
      .order('ready_for_delivery_at', { ascending: true, nullsFirst: true })
      .limit(LIST_LIMIT),
    // 5. Waiting for a cleaner, soonest pickup first.
    supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('status', 'pending_assignment')
      .order('scheduled_date', { ascending: true })
      .limit(LIST_LIMIT),
    // 6. Failed, orphan pending (same rule as lib/database/payments.ts) and
    //    stale pending (charge id but no webhook for STALE_PENDING_DAYS).
    supabase
      .from('payments')
      .select(PAYMENT_SELECT)
      .or(
        `status.eq.failed,and(status.eq.pending,provider_reference.is.null,created_at.lt.${orphanPendingCutoffIso(now)}),and(status.eq.pending,provider_reference.not.is.null,created_at.lt.${stalePendingCutoffIso(now)})`
      )
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT),
    // 7. Active recurring subscriptions; the embedded orders are reduced to
    //    non-terminal ones, so an empty array means the rolling window failed.
    supabase
      .from('subscriptions')
      .select(`id, customer_id, frequency, started_at, ${CUSTOMER_NAME_SELECT}, orders!subscription_id(id)`)
      .eq('status', 'active')
      .neq('frequency', 'on_demand')
      .lt('started_at', activationCutoff)
      .in('orders.status', ACTIVE_ORDER_STATUSES)
      .limit(LIST_LIMIT),
    // 8. Active agreements whose first order was never created.
    supabase
      .from('payment_agreements')
      .select(`id, customer_id, provider_agreement_id, activated_at, ${CUSTOMER_NAME_SELECT}, orders!payment_agreement_id(id)`)
      .eq('status', 'active')
      .lt('activated_at', activationCutoff)
      .limit(LIST_LIMIT),
  ]);

  const subscriptionRows = rows<AttentionSubscription>(subscriptions, 'subscriptions');
  const agreementRows = rows<AttentionAgreement>(agreements, 'payment agreements');

  return {
    today,
    pickupsToday: rows<AttentionOrder>(pickupsToday, 'pickups today'),
    deliveriesToday: rows<AttentionOrder>(deliveriesToday, 'deliveries today'),
    overduePickups: rows<AttentionOrder>(overduePickups, 'overdue pickups'),
    readyTooLong: rows<AttentionOrder>(readyTooLong, 'ready too long'),
    pendingAssignment: rows<AttentionOrder>(pendingAssignment, 'pending assignment'),
    paymentsToFollowUp: rows<AttentionPayment>(payments, 'payments'),
    subscriptionsWithoutOrder:
      subscriptionRows === null ? null : subscriptionRows.filter((s) => s.orders.length === 0),
    agreementsWithoutOrder:
      agreementRows === null ? null : agreementRows.filter((a) => a.orders.length === 0),
  };
}
