// Vipps Recurring API Client
// Implements RESERVE_CAPTURE flow for recurring subscription payments

import type { VippsAgreementStatus, VippsChargeStatus } from '@/types/database';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface VippsConfig {
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

interface VippsCreateAgreementParams {
  productName: string;
  productDescription: string;
  price: number; // in øre (1 NOK = 100 øre)
  interval: 'MONTH' | 'YEAR';
  initialCharge?: {
    amount: number; // in øre
    description: string;
    transactionType: 'RESERVE_CAPTURE'; // Always use RESERVE_CAPTURE
  };
  merchantRedirectUrl: string;
  merchantAgreementUrl: string;
}

interface VippsCreateChargeParams {
  amount: number; // in øre
  description: string;
  due: string; // ISO date (YYYY-MM-DD), minimum 2 days in future
  retryDays: number;
  transactionType: 'RESERVE_CAPTURE';
}

interface VippsCaptureChargeParams {
  amount: number; // in øre
  description: string;
}

// =============================================================================
// VIPPS RECURRING API CLIENT
// =============================================================================

export class VippsRecurringClient {
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
  // AGREEMENTS
  // ---------------------------------------------------------------------------

  /**
   * Create recurring payment agreement
   * Returns agreement ID and checkout URL for user approval
   */
  async createAgreement(params: VippsCreateAgreementParams): Promise<{
    agreementId: string;
    vippsConfirmationUrl: string;
  }> {
    const token = await this.authenticate();

    const body = {
      productName: params.productName,
      productDescription: params.productDescription,
      pricing: {
        amount: params.price,
        currency: 'NOK',
      },
      interval: {
        unit: params.interval,
        count: 1,
      },
      merchantRedirectUrl: params.merchantRedirectUrl,
      merchantAgreementUrl: params.merchantAgreementUrl,
      ...(params.initialCharge && {
        initialCharge: {
          amount: params.initialCharge.amount,
          currency: 'NOK',
          description: params.initialCharge.description,
          transactionType: 'RESERVE_CAPTURE', // Always use RESERVE_CAPTURE
        },
      }),
    };

    const response = await fetch(`${this.config.baseUrl}/recurring/v3/agreements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Merchant-Serial-Number': this.config.merchantSerialNumber,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps create agreement failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    return {
      agreementId: data.agreementId,
      vippsConfirmationUrl: data.vippsConfirmationUrl,
    };
  }

  /**
   * Get agreement details
   */
  async getAgreement(agreementId: string): Promise<{
    id: string;
    status: VippsAgreementStatus;
    start: string;
    stop?: string;
    pricing: {
      amount: number;
      currency: string;
    };
  }> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.config.baseUrl}/recurring/v3/agreements/${agreementId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps get agreement failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Stop agreement (cancel subscription)
   */
  async stopAgreement(agreementId: string): Promise<void> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.config.baseUrl}/recurring/v3/agreements/${agreementId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'STOPPED',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps stop agreement failed (${response.status}): ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // CHARGES (RESERVE_CAPTURE)
  // ---------------------------------------------------------------------------

  /**
   * Create charge on agreement (scheduled recurring payment)
   * Uses RESERVE_CAPTURE - funds will be reserved first, then must be captured
   */
  async createCharge(agreementId: string, params: VippsCreateChargeParams): Promise<{
    chargeId: string;
  }> {
    const token = await this.authenticate();

    // Generate idempotency key to prevent duplicate charges
    const idempotencyKey = `${agreementId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const body = {
      amount: params.amount,
      currency: 'NOK',
      description: params.description,
      due: params.due,
      retryDays: params.retryDays,
      transactionType: 'RESERVE_CAPTURE', // Always use RESERVE_CAPTURE
      type: 'RECURRING',
    };

    const response = await fetch(
      `${this.config.baseUrl}/recurring/v3/agreements/${agreementId}/charges`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps create charge failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    return {
      chargeId: data.chargeId,
    };
  }

  /**
   * Get charge details
   */
  async getCharge(agreementId: string, chargeId: string): Promise<{
    id: string;
    status: VippsChargeStatus;
    amount: number;
    transactionId?: string;
    due: string;
    type: string;
    transactionType: string;
    summary?: {
      captured: number;
      refunded: number;
      cancelled: number;
    };
  }> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.config.baseUrl}/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps get charge failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Capture reserved charge (CRITICAL for RESERVE_CAPTURE flow)
   * Must be called after charge status becomes RESERVED
   * Supports full or partial capture
   */
  async captureCharge(agreementId: string, chargeId: string, params: VippsCaptureChargeParams): Promise<void> {
    const token = await this.authenticate();

    // Generate idempotency key for capture operation
    const idempotencyKey = `capture-${chargeId}-${Date.now()}`;

    const body = {
      amount: params.amount,
      description: params.description,
    };

    const response = await fetch(
      `${this.config.baseUrl}/recurring/v3/agreements/${agreementId}/charges/${chargeId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps capture charge failed (${response.status}): ${error}`);
    }

    // Capture endpoint returns HTTP 204 No Content on success
  }

  /**
   * Cancel charge (only for PENDING, DUE, or RESERVED status)
   */
  async cancelCharge(agreementId: string, chargeId: string): Promise<void> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.config.baseUrl}/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
          'Merchant-Serial-Number': this.config.merchantSerialNumber,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vipps cancel charge failed (${response.status}): ${error}`);
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create Vipps client with environment configuration
 */
export function createVippsClient(): VippsRecurringClient {
  // Validate required environment variables
  const requiredEnvVars = [
    'VIPPS_CLIENT_ID',
    'VIPPS_CLIENT_SECRET',
    'VIPPS_SUBSCRIPTION_KEY',
    'VIPPS_MERCHANT_SERIAL_NUMBER',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return new VippsRecurringClient({
    clientId: process.env.VIPPS_CLIENT_ID!,
    clientSecret: process.env.VIPPS_CLIENT_SECRET!,
    subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY!,
    merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER!,
    baseUrl: process.env.VIPPS_API_URL || 'https://apitest.vipps.no', // Default to test environment
  });
}
