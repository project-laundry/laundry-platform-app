// Order timing constants for NooraCare

export const ORDER_TIMING = {
  days_between_pickup_and_delivery: 2,
  minimum_days_notice: 2,
} as const;

export const DAYS_PICKUP_TO_DELIVERY = ORDER_TIMING.days_between_pickup_and_delivery;
export const MIN_DAYS_NOTICE = ORDER_TIMING.minimum_days_notice;
