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
