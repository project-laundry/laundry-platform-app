// Pickup time constants for NooraCare orders

export const PICKUP_TIME_RANGE = {
  start: '15:00',
  end: '18:00',
} as const;

export function getPickupTimeRangeLabel(): string {
  return `${PICKUP_TIME_RANGE.start} - ${PICKUP_TIME_RANGE.end}`;
}
