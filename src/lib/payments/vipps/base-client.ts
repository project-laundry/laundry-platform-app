// Vipps Base Client
// Shared authentication and HTTP utilities for all Vipps APIs
// Used by both Recurring API and ePayment API clients

// =============================================================================
// TYPES
// =============================================================================

export interface VippsConfig {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  baseUrl: string; // https://apitest.vipps.no or https://api.vipps.no
}

interface VippsAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// =============================================================================
// VIPPS BASE CLIENT
// =============================================================================

/**
 * Base client providing shared authentication and HTTP utilities
 * for all Vipps APIs (Recurring, ePayment, etc.)
 *
 * Uses composition pattern - specialized clients create and own
 * an instance of this base client to handle common functionality
 */
export class VippsBaseClient {
  private config: VippsConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  constructor(config: VippsConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with Vipps and get bearer token
   * Caches token with 1-minute buffer before expiry
   *
   * @returns Bearer token for API requests
   */
  async authenticate(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    // Request new token
    const response = await fetch(`${this.config.baseUrl}/accesstoken/get`, {
      method: 'POST',
      headers: {
        'client_id': this.config.clientId,
        'client_secret': this.config.clientSecret,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps authentication failed (${response.status}): ${error}`);
    }

    const data: VippsAccessToken = await response.json();
    this.accessToken = data.access_token;
    // Set expiry with 1-minute buffer to avoid using expired tokens
    this.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000) - 60000);

    return this.accessToken;
  }

  // ---------------------------------------------------------------------------
  // HTTP UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Get common headers for Vipps API requests
   * Includes Authorization, Merchant-Serial-Number, and Subscription-Key
   *
   * @param includeAuth - Whether to include Authorization header (default true)
   * @returns Headers object for fetch requests
   */
  async getCommonHeaders(includeAuth: boolean = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      'Merchant-Serial-Number': this.config.merchantSerialNumber,
      'Content-Type': 'application/json',
    };

    // Add Authorization header if requested
    if (includeAuth) {
      const token = await this.authenticate();
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle Vipps API error responses
   * Throws descriptive error with context
   *
   * @param response - Failed HTTP response
   * @param context - Context string for error message (e.g., "create payment")
   */
  async handleVippsError(response: Response, context: string): Promise<never> {
    const error = await response.text();
    throw new Error(`Vipps ${context} failed (${response.status}): ${error}`);
  }

  /**
   * Get base URL for Vipps API
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }
}
