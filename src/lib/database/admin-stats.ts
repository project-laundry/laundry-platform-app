// Aggregate counts for the admin overview page.

import { createAdminClient } from '@/lib/supabase/admin';
import { orphanPendingCutoffIso } from '@/lib/utils/payment-status';

export interface AdminOverviewCounts {
  pendingAssignmentOrders: number;
  activeOrders: number;
  pendingCleaners: number;
  failedPayments: number;
  customers: number;
}

const ACTIVE_ORDER_STATUSES = [
  'pending_assignment',
  'pickup_scheduled',
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
];

/**
 * Head-only count queries (no rows transferred). A failed count degrades
 * to 0 rather than failing the whole overview page.
 */
export async function getAdminOverviewCounts(): Promise<AdminOverviewCounts> {
  const supabase = createAdminClient();

  const [pendingAssignment, active, pendingCleaners, failedPayments, orphanPendingPayments, customers] =
    await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_assignment'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_ORDER_STATUSES),
      supabase
        .from('cleaners')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'pending'),
      supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      // Pending Vipps rows that never got a charge id: the charge was never
      // created, so they are failures in practice. Same rule as the "Feilet"
      // list filter in lib/database/payments.ts.
      supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('provider_reference', null)
        .lt('created_at', orphanPendingCutoffIso()),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
    ]);

  return {
    pendingAssignmentOrders: pendingAssignment.count ?? 0,
    activeOrders: active.count ?? 0,
    pendingCleaners: pendingCleaners.count ?? 0,
    failedPayments: (failedPayments.count ?? 0) + (orphanPendingPayments.count ?? 0),
    customers: customers.count ?? 0,
  };
}
