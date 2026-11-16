// Aggregate counts for the admin overview page.

import { createAdminClient } from '@/lib/supabase/admin';
import { orphanPendingCutoffIso } from '@/lib/utils/payment-status';

/** `null` = the count query failed. The page shows an error, never 0. */
export interface AdminOverviewCounts {
  pendingAssignmentOrders: number | null;
  activeOrders: number | null;
  pendingCleaners: number | null;
  failedPayments: number | null;
  customers: number | null;
}

const ACTIVE_ORDER_STATUSES = [
  'pending_assignment',
  'pickup_scheduled',
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
];

/** A head-only count result → number, or null when the query errored. */
function countOrNull(result: { count: number | null; error: unknown }, label: string): number | null {
  if (result.error) {
    console.error(`[Admin Stats] ${label} count failed:`, result.error);
    return null;
  }
  return result.count ?? 0;
}

/**
 * Head-only count queries (no rows transferred). A failed count is reported
 * as null so the overview can show an error instead of a false "0".
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

  const failed = countOrNull(failedPayments, 'failed payments');
  const orphan = countOrNull(orphanPendingPayments, 'orphan pending payments');

  return {
    pendingAssignmentOrders: countOrNull(pendingAssignment, 'pending assignment orders'),
    activeOrders: countOrNull(active, 'active orders'),
    pendingCleaners: countOrNull(pendingCleaners, 'pending cleaners'),
    failedPayments: failed === null || orphan === null ? null : failed + orphan,
    customers: countOrNull(customers, 'customers'),
  };
}
