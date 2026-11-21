import { describe, expect, it } from 'vitest';
import { orderAuthRedirect, safeNextPath, withNext } from './next-path';

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

describe('orderAuthRedirect', () => {
  it('sends the order flow steps to signup with the step as next', () => {
    expect(orderAuthRedirect('/orders/wash')).toBe('/auth/signup?next=%2Forders%2Fwash');
    expect(orderAuthRedirect('/orders/confirm')).toBe('/auth/signup?next=%2Forders%2Fconfirm');
  });

  it('sends other order pages to login and keeps the query string', () => {
    expect(orderAuthRedirect('/orders/details/abc')).toBe('/auth/login?next=%2Forders%2Fdetails%2Fabc');
    expect(orderAuthRedirect('/orders/success', '?status=ok')).toBe(
      '/auth/login?next=%2Forders%2Fsuccess%3Fstatus%3Dok'
    );
  });

  it('ignores everything outside /orders', () => {
    expect(orderAuthRedirect('/')).toBeNull();
    expect(orderAuthRedirect('/dashboard')).toBeNull();
    expect(orderAuthRedirect('/orders-archive')).toBeNull();
  });
});
