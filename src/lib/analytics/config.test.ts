import { describe, it, expect } from 'vitest';
import { AUTOCAPTURE_URL_IGNORELIST, isAnalyticsHost, isDroppedPageEvent, isRecordingAllowed } from './config';

describe('isAnalyticsHost', () => {
  it('sends from production and staging', () => {
    expect(isAnalyticsHost('nooracare.no')).toBe(true);
    expect(isAnalyticsHost('www.nooracare.no')).toBe(true);
    expect(isAnalyticsHost('test.nooracare.no')).toBe(true);
    expect(isAnalyticsHost('NooraCare.no')).toBe(true);
  });

  it('never sends from localhost or previews', () => {
    expect(isAnalyticsHost('localhost')).toBe(false);
    expect(isAnalyticsHost('127.0.0.1')).toBe(false);
    expect(isAnalyticsHost('laundry-platform-app-git-develop-randrianas-projects.vercel.app')).toBe(false);
    expect(isAnalyticsHost('')).toBe(false);
    expect(isAnalyticsHost(null)).toBe(false);
    expect(isAnalyticsHost(undefined)).toBe(false);
  });
});

describe('AUTOCAPTURE_URL_IGNORELIST', () => {
  // posthog-js tests each string as a RegExp against the full URL.
  const ignored = (url: string) => AUTOCAPTURE_URL_IGNORELIST.some((p) => new RegExp(p).test(url));

  it('turns autocapture off where element text is customer or cleaner data', () => {
    for (const url of [
      'https://nooracare.no/admin',
      'https://nooracare.no/admin/orders/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      'https://nooracare.no/dashboard',
      'https://nooracare.no/dashboard/cleaner/settings',
      'https://nooracare.no/bli-renser/business',
      'https://nooracare.no/bli-renser/signup',
      'https://nooracare.no/orders/details/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      'https://nooracare.no/orders/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b/cancel',
    ]) {
      expect(ignored(url), url).toBe(true);
    }
  });

  it('keeps autocapture on for the public pages and the order funnel', () => {
    for (const url of [
      'https://nooracare.no/',
      'https://nooracare.no/?utm_source=instagram',
      'https://nooracare.no/bli-renser',
      'https://nooracare.no/bli-renser?utm_source=instagram',
      'https://nooracare.no/pris-kalkulator',
      'https://nooracare.no/orders/wash',
      'https://nooracare.no/orders/pickup',
      'https://nooracare.no/orders/confirm',
      'https://nooracare.no/orders/success',
      'https://nooracare.no/auth/login?next=%2Forders%2Fconfirm',
      'https://nooracare.no/auth/signup',
    ]) {
      expect(ignored(url), url).toBe(false);
    }
  });
});

describe('isRecordingAllowed', () => {
  it('allows session replay on the public pages and the three order steps', () => {
    for (const path of ['/', '/bli-renser', '/pris-kalkulator', '/orders/wash', '/orders/pickup', '/orders/confirm', '/orders/success', '/salgsvilkar']) {
      expect(isRecordingAllowed(path), path).toBe(true);
    }
  });

  it('never records pages that show personal data', () => {
    for (const path of [
      '/admin',
      '/admin/customers',
      '/dashboard',
      '/dashboard/cleaner/earnings',
      '/bli-renser/signup',
      '/bli-renser/business',
      '/orders/details/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      '/evaluering/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      '/orders/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b/cancel',
      '/auth/login',
      '/auth/forgot-password',
      '/auth/success',
    ]) {
      expect(isRecordingAllowed(path), path).toBe(false);
    }
  });
});

describe('isDroppedPageEvent', () => {
  it('drops page views and page leaves on /admin and /dashboard', () => {
    for (const url of [
      'https://nooracare.no/admin',
      'https://nooracare.no/admin/orders/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      'https://nooracare.no/dashboard',
      'https://nooracare.no/dashboard?welcome=1',
      'https://test.nooracare.no/dashboard/cleaner/settings',
    ]) {
      expect(isDroppedPageEvent('$pageview', url), url).toBe(true);
      expect(isDroppedPageEvent('$pageleave', url), url).toBe(true);
    }
  });

  it('keeps every other event from those pages, browser errors above all', () => {
    for (const event of ['$exception', '$autocapture', '$rageclick', 'checkout_result']) {
      expect(isDroppedPageEvent(event, 'https://nooracare.no/admin/orders'), event).toBe(false);
      expect(isDroppedPageEvent(event, 'https://nooracare.no/dashboard'), event).toBe(false);
    }
  });

  it('keeps page views everywhere else', () => {
    for (const url of [
      'https://nooracare.no/',
      'https://nooracare.no/bli-renser',
      'https://nooracare.no/bli-renser/business',
      'https://nooracare.no/orders/wash',
      'https://nooracare.no/orders/success',
      'https://nooracare.no/orders/details/8b1d2b2e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
      'https://nooracare.no/auth/login?next=%2Fdashboard',
      'https://nooracare.no/?next=/admin',
      'https://nooracare.no/administrator',
      'https://nooracare.no/dashboards',
    ]) {
      expect(isDroppedPageEvent('$pageview', url), url).toBe(false);
      expect(isDroppedPageEvent('$pageleave', url), url).toBe(false);
    }
  });

  it('never drops an event without a usable URL', () => {
    expect(isDroppedPageEvent('$pageview', undefined)).toBe(false);
    expect(isDroppedPageEvent('$pageview', '')).toBe(false);
    expect(isDroppedPageEvent('$pageview', '/admin')).toBe(false);
    expect(isDroppedPageEvent('$pageview', 42)).toBe(false);
  });
});
