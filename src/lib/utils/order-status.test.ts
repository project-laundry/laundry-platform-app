import { describe, it, expect } from 'vitest';
import type { OrderStatus } from '@/types/database';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
  getOrderStatusLabel,
  getOrderStatusVariant,
  isOrderCompleted,
  isOrderActive,
} from './order-status';

const ALL_STATUSES: OrderStatus[] = [
  'pending_assignment',
  'pickup_scheduled',
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
  'completed',
  'cancelled',
];

describe('order status labels & variants', () => {
  it('has a non-empty label for every status', () => {
    for (const status of ALL_STATUSES) {
      expect(getOrderStatusLabel(status)).toBe(ORDER_STATUS_LABELS[status]);
      expect(getOrderStatusLabel(status).length).toBeGreaterThan(0);
    }
  });

  it('has a variant for every status', () => {
    for (const status of ALL_STATUSES) {
      expect(getOrderStatusVariant(status)).toBe(ORDER_STATUS_VARIANT[status]);
    }
  });
});

describe('isOrderCompleted / isOrderActive', () => {
  it('treats completed and cancelled as completed', () => {
    expect(isOrderCompleted('completed')).toBe(true);
    expect(isOrderCompleted('cancelled')).toBe(true);
    expect(isOrderCompleted('in_cleaning')).toBe(false);
  });

  it('treats every non-terminal status as active', () => {
    expect(isOrderActive('pending_assignment')).toBe(true);
    expect(isOrderActive('completed')).toBe(false);
    expect(isOrderActive('cancelled')).toBe(false);
  });
});
