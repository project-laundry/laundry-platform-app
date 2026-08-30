// Aggregate counts for the admin overview page.

import { createAdminClient } from '@/lib/supabase/admin';

export interface AdminOverviewCounts {
  pendingAssignmentOrders: number;
  activeOrders: number;
  pendingCleaners: number;
  failedPayments: number;
  customers: number;
  drivers: number;
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

  const [pendingAssignment, active, pendingCleaners, failedPayments, customers, drivers] =
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
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
    ]);

  return {
    pendingAssignmentOrders: pendingAssignment.count ?? 0,
    activeOrders: active.count ?? 0,
    pendingCleaners: pendingCleaners.count ?? 0,
    failedPayments: failedPayments.count ?? 0,
    customers: customers.count ?? 0,
    drivers: drivers.count ?? 0,
  };
}
