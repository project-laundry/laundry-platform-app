// Vipps Configuration and Validation

/**
 * The only two Vipps API hosts that exist. Anything else is a misconfiguration.
 */
const VIPPS_API_URLS = {
  test: 'https://apitest.vipps.no',
  production: 'https://api.vipps.no',
} as const;

/**
 * Validate that all required Vipps environment variables are set and that
 * VIPPS_API_URL is one of the two known Vipps hosts.
 * @throws Error if any required variable is missing or VIPPS_API_URL is invalid
 */
export function validateVippsConfig(): void {
  const required = [
    'VIPPS_CLIENT_ID',
    'VIPPS_CLIENT_SECRET',
    'VIPPS_SUBSCRIPTION_KEY',
    'VIPPS_MERCHANT_SERIAL_NUMBER',
    'VIPPS_API_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Vipps environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all Vipps credentials are configured.'
    );
  }

  // Presence is not enough: a mistyped URL must fail too.
  getVippsApiUrl();
}

/**
 * Check if Vipps is fully configured
 * @returns true if all required env vars are set and VIPPS_API_URL is valid
 */
export function isVippsConfigured(): boolean {
  try {
    validateVippsConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * The Vipps API base URL. Fails closed: there is deliberately no default, so a
 * deployment with VIPPS_API_URL missing or mistyped cannot silently talk to the
 * test API (or anything else) — every Vipps call throws instead.
 *
 * Accepts exactly https://apitest.vipps.no or https://api.vipps.no; surrounding
 * whitespace and trailing slashes are tolerated and stripped.
 * @throws Error when VIPPS_API_URL is unset or not a known Vipps host
 */
export function getVippsApiUrl(): string {
  const raw = process.env.VIPPS_API_URL;
  if (!raw) {
    throw new Error(
      'VIPPS_API_URL is not set. It must be exactly https://apitest.vipps.no (test) ' +
      'or https://api.vipps.no (production).'
    );
  }

  const url = raw.trim().replace(/\/+$/, '');
  if (url !== VIPPS_API_URLS.test && url !== VIPPS_API_URLS.production) {
    throw new Error(
      `VIPPS_API_URL is "${raw}". It must be exactly https://apitest.vipps.no (test) ` +
      'or https://api.vipps.no (production).'
    );
  }

  return url;
}

/**
 * Get Vipps environment (test or production), derived from the validated
 * VIPPS_API_URL by exact match — never by substring sniffing.
 * @throws Error when VIPPS_API_URL is unset or invalid (see getVippsApiUrl)
 */
export function getVippsEnvironment(): 'test' | 'production' {
  return getVippsApiUrl() === VIPPS_API_URLS.test ? 'test' : 'production';
}

/**
 * Whether the test-only force-accept helper may be used (forceAcceptAgreementAction
 * and the "Auto-godkjenn avtale" checkbox). Requires an explicit opt-in AND the
 * Vipps test API — the flag alone is never enough, so a copied env var can't
 * enable it against api.vipps.no. The flag is NEXT_PUBLIC_ so the client
 * component can hide the checkbox without a round-trip; it is a toggle, not a secret.
 *
 * Never throws: a missing or invalid VIPPS_API_URL simply means "not allowed".
 */
export function isVippsForceAcceptAllowed(): boolean {
  if (process.env.NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT !== 'true') {
    return false;
  }
  try {
    return getVippsEnvironment() === 'test';
  } catch {
    return false;
  }
}

/**
 * Vipps MT test users (whitelisted by Vipps). The test-only force-accept
 * endpoint only works for these numbers, so we can't send whatever phone the
 * tester typed at signup. Never used in production: force-accept is gated on
 * isVippsForceAcceptAllowed().
 */
const VIPPS_TEST_PHONES = [
  '4746170809',
  '4796394196',
  '4796595670',
  '4796885121',
  '4796841377',
];

/**
 * Pick a Vipps test phone for a customer, deterministically, so the same test
 * customer always maps to the same Vipps test user (and its MT app shows all
 * of that customer's agreements and charges).
 */
export function pickVippsTestPhone(customerId: string): string {
  let hash = 0;
  for (const char of customerId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return VIPPS_TEST_PHONES[hash % VIPPS_TEST_PHONES.length];
}
