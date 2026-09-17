// Vipps Configuration and Validation

/**
 * Validate that all required Vipps environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateVippsConfig(): void {
  const required = [
    'VIPPS_CLIENT_ID',
    'VIPPS_CLIENT_SECRET',
    'VIPPS_SUBSCRIPTION_KEY',
    'VIPPS_MERCHANT_SERIAL_NUMBER',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Vipps environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all Vipps credentials are configured.'
    );
  }
}

/**
 * Check if Vipps is fully configured
 * @returns true if all required env vars are set
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
 * Get Vipps environment (test or production)
 */
export function getVippsEnvironment(): 'test' | 'production' {
  const apiUrl = process.env.VIPPS_API_URL || 'https://apitest.vipps.no';
  return apiUrl.includes('apitest') ? 'test' : 'production';
}

/**
 * Check if running in Vipps test environment
 */
export function isVippsTestEnvironment(): boolean {
  return getVippsEnvironment() === 'test';
}

/**
 * Vipps MT test users (whitelisted by Vipps). The test-only force-accept
 * endpoint only works for these numbers, so we can't send whatever phone the
 * tester typed at signup. Never used in production: force-accept is gated on
 * isVippsTestEnvironment().
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
