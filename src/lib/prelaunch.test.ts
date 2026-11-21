import { describe, it, expect } from 'vitest';
import { isGatedHost, isPublicPrelaunchPath, shouldRedirectToComingSoon } from './prelaunch';

describe('isGatedHost', () => {
  it('gates only the production domain', () => {
    expect(isGatedHost('nooracare.no')).toBe(true);
    expect(isGatedHost('www.nooracare.no')).toBe(true);
    expect(isGatedHost('NooraCare.no:443')).toBe(true);
  });

  it('leaves staging, local dev and previews open', () => {
    expect(isGatedHost('test.nooracare.no')).toBe(false);
    expect(isGatedHost('localhost:3000')).toBe(false);
    expect(isGatedHost('laundry-platform-git-develop.vercel.app')).toBe(false);
    expect(isGatedHost(null)).toBe(false);
  });
});

describe('isPublicPrelaunchPath', () => {
  it('allows the customer, coming-soon, legal, contact and admin surfaces', () => {
    for (const p of [
      '/',
      '/auth/login',
      '/auth/signup',
      '/auth/success',
      '/orders/wash',
      '/orders/confirm',
      '/bli-renser',
      '/kontakt',
      '/personvern',
      '/personvern-renser',
      '/salgsvilkar',
      '/pris-kalkulator',
      '/auth/callback',
      '/auth/error',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/api/webhooks/vipps/recurring',
      '/admin',
      '/admin/orders/123',
      '/opengraph-image',
      '/opengraph-image-8f2a1c.png',
      '/bli-renser/opengraph-image',
    ]) {
      expect(isPublicPrelaunchPath(p), p).toBe(true);
    }
  });

  it('blocks cleaner signup, onboarding, the parked page and the dashboards', () => {
    for (const p of [
      '/bli-renser/signup',
      '/bli-renser/signup/success',
      '/bli-renser/lansering',
      '/bli-renser/business',
      '/dashboard',
    ]) {
      expect(isPublicPrelaunchPath(p), p).toBe(false);
    }
  });
});

describe('shouldRedirectToComingSoon', () => {
  const prod = { host: 'nooracare.no', hasSession: false };

  it('redirects anonymous production visitors away from blocked paths', () => {
    expect(shouldRedirectToComingSoon({ ...prod, pathname: '/bli-renser/signup' })).toBe(true);
    expect(shouldRedirectToComingSoon({ ...prod, pathname: '/dashboard' })).toBe(true);
  });

  it('lets anonymous production visitors see public paths', () => {
    expect(shouldRedirectToComingSoon({ ...prod, pathname: '/bli-renser' })).toBe(false);
    expect(shouldRedirectToComingSoon({ ...prod, pathname: '/orders/wash' })).toBe(false);
    expect(shouldRedirectToComingSoon({ ...prod, pathname: '/auth/login' })).toBe(false);
  });

  it('lets signed-in users through on production', () => {
    expect(
      shouldRedirectToComingSoon({ ...prod, hasSession: true, pathname: '/dashboard' })
    ).toBe(false);
  });

  it('never redirects on staging or localhost', () => {
    expect(
      shouldRedirectToComingSoon({ host: 'test.nooracare.no', hasSession: false, pathname: '/bli-renser/signup' })
    ).toBe(false);
    expect(
      shouldRedirectToComingSoon({ host: 'localhost:3000', hasSession: false, pathname: '/dashboard' })
    ).toBe(false);
  });
});
