// Order timing constants for NooraCare

export const ORDER_TIMING = {
  days_between_pickup_and_delivery: 2,
  hours_before_pickup_reschedule_cutoff: 24,
} as const;

export const DAYS_PICKUP_TO_DELIVERY = ORDER_TIMING.days_between_pickup_and_delivery;
export const HOURS_BEFORE_PICKUP_RESCHEDULE_CUTOFF = ORDER_TIMING.hours_before_pickup_reschedule_cutoff;
