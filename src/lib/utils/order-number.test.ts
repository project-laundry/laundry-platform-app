import { describe, it, expect } from 'vitest';
import { generateOrderNumber } from './order-number';

const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

describe('generateOrderNumber', () => {
  it('defaults to 8 characters', () => {
    expect(generateOrderNumber()).toHaveLength(8);
  });

  it('honors a custom length', () => {
    expect(generateOrderNumber(6)).toHaveLength(6);
    expect(generateOrderNumber(12)).toHaveLength(12);
  });

  it('only uses unambiguous characters (no 0/O/1/I/L)', () => {
    for (let i = 0; i < 200; i++) {
      for (const char of generateOrderNumber()) {
        expect(CHARSET).toContain(char);
      }
    }
  });

  it('produces mostly unique values across a sample', () => {
    const sample = new Set(Array.from({ length: 1000 }, () => generateOrderNumber()));
    // 31^8 keyspace — collisions in 1000 draws should be vanishingly unlikely
    expect(sample.size).toBeGreaterThan(995);
  });
});
