// The time window for NooraCare orders. It is BOTH the pickup and the delivery
// window: the cleaner picks up and delivers in the same afternoon round
// («Dagens runde»), so the laundry comes back between the same hours it was
// collected. The name is historical.

export const PICKUP_TIME_RANGE = {
  start: '15:00',
  end: '18:00',
} as const;

export function getPickupTimeRangeLabel(): string {
  return `${PICKUP_TIME_RANGE.start} - ${PICKUP_TIME_RANGE.end}`;
}
