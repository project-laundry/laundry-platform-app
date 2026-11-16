import type { OrderStatus } from '@/types/database';

/**
 * Norwegian labels for order statuses
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_assignment: 'Venter på tildeling',
  pickup_scheduled: 'Planlagt henting',
  picked_up: 'Hentet',
  in_cleaning: 'Vaskes',
  ready_for_delivery: 'Klar for levering',
  out_for_delivery: 'Leveres',
  completed: 'Fullført',
  cancelled: 'Kansellert',
};

/**
 * Badge variants for order statuses
 */
export const ORDER_STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'info' | 'warning' | 'neutral'> = {
  pending_assignment: 'warning',
  pickup_scheduled: 'info',
  picked_up: 'info',
  in_cleaning: 'info',
  ready_for_delivery: 'info',
  out_for_delivery: 'info',
  completed: 'success',
  cancelled: 'destructive',
};

/**
 * Get display label for order status
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

/**
 * Get badge variant for order status
 */
export function getOrderStatusVariant(status: OrderStatus): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'info' | 'warning' | 'neutral' {
  return ORDER_STATUS_VARIANT[status];
}

/**
 * The order lifecycle in sequence (cancelled excluded — it is a terminal
 * side-exit, not a step).
 */
export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  'pending_assignment',
  'pickup_scheduled',
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
  'completed',
];

/**
 * Get the 0-based step index of a status in the lifecycle (-1 for cancelled)
 */
export function getOrderStatusStep(status: OrderStatus): number {
  return ORDER_STATUS_SEQUENCE.indexOf(status);
}

/**
 * Segments of the customer progress bar. picked_up and out_for_delivery are
 * driver-flow statuses the cleaner-run flow never enters, so they would be
 * segments nothing lands on. Still in ORDER_STATUS_SEQUENCE, which the
 * cancellation logic relies on.
 */
export const CUSTOMER_PROGRESS_STEPS: OrderStatus[] = ORDER_STATUS_SEQUENCE.filter(
  (status) => status !== 'picked_up' && status !== 'out_for_delivery'
);

/**
 * Check if order is completed (completed or cancelled)
 */
export function isOrderCompleted(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Check if order is active (not completed or cancelled)
 */
export function isOrderActive(status: OrderStatus): boolean {
  return !isOrderCompleted(status);
}
