// Order Number Generation
// Format: 6-character alphanumeric (e.g., A7K2X9, P3M8NV)

// Character set excludes confusing characters: 0/O, 1/I/L
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ORDER_NUMBER_LENGTH = 8;

/**
 * Generates a random order number
 * @returns 6-character alphanumeric string
 */
export function generateOrderNumber(length: number = ORDER_NUMBER_LENGTH): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    result += CHARSET[randomIndex];
  }
  return result;
}