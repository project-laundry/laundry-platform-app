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
