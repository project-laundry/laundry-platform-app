import { describe, expect, it } from 'vitest';
import { safeNextPath, withNext } from './next-path';

describe('safeNextPath', () => {
  it('accepts same-site paths', () => {
    expect(safeNextPath('/orders/confirm')).toBe('/orders/confirm');
    expect(safeNextPath('/dashboard?tab=1')).toBe('/dashboard?tab=1');
  });

  it('rejects missing, relative, absolute and protocol-relative values', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath('orders/confirm')).toBeNull();
    expect(safeNextPath('https://evil.example/x')).toBeNull();
    expect(safeNextPath('//evil.example/x')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
  });
});

describe('withNext', () => {
  it('appends an encoded next param only when there is one', () => {
    expect(withNext('/auth/login', '/orders/confirm')).toBe('/auth/login?next=%2Forders%2Fconfirm');
    expect(withNext('/auth/login', null)).toBe('/auth/login');
  });
});
