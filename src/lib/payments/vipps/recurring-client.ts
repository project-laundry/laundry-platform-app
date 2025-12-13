// Vipps Recurring API Client
// Implements RESERVE_CAPTURE flow for recurring subscription payments
// API Reference: /recurring/v3/*

import { VippsBaseClient, type VippsConfig } from './base-client';
import type { VippsAgreementStatus, VippsChargeStatus } from '@/types/database';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface VippsCreateAgreementParams {
  productName: string;
  productDescription: string;
  price: number; // in øre (1 NOK = 100 øre)    
  merchantRedirectUrl: string;
  merchantAgreementUrl: string;
}

interface VippsListAgreementsParams {
  status?: 'PENDING' | 'ACTIVE' | 'STOPPED' | 'EXPIRED';
  createdAfter?: number; // Unix timestamp in milliseconds
  pageNumber?: number;
  pageSize?: number;
}

interface VippsCreateChargeParams {
  amount: number; // in øre
  description: string;
  due: string; // ISO date (YYYY-MM-DD), minimum 2 days in future
  retryDays: number;
  transactionType?: 'DIRECT_CAPTURE' | 'RESERVE_CAPTURE'; // Default: DIRECT_CAPTURE for recurring
}

interface VippsCaptureChargeParams {
  amount: number; // in øre
  description: string;
}

// =============================================================================
// VIPPS RECURRING API CLIENT
// =============================================================================

/**
 * Client for Vipps Recurring API v3
 * Handles subscription-based recurring payments
 *
 * Uses composition pattern with VippsBaseClient for shared auth/HTTP utilities
 */
export class VippsRecurringClient {
  private baseClient: VippsBaseClient;

  constructor(config: VippsConfig) {
    this.baseClient = new VippsBaseClient(config);
  }

  // ---------------------------------------------------------------------------
  // AGREEMENTS
  // ---------------------------------------------------------------------------

  /**
   * List all agreements
   * Filter by status, creation date, and paginate results
   */
  async listAgreements(params?: VippsListAgreementsParams): Promise<Array<{
    id: string;
    status: VippsAgreementStatus;
    start?: string;
    stop?: string;
    pricing: {
      type: string;
      amount: number;
      currency: string;
    };
    interval: {
      unit: string;
      count: number;
    };
  }>> {
    const headers = await this.baseClient.getCommonHeaders();

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.createdAfter) queryParams.append('createdAfter', params.createdAfter.toString());
    if (params?.pageNumber) queryParams.append('pageNumber', params.pageNumber.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const queryString = queryParams.toString();
    const url = `${this.baseClient.getBaseUrl()}/recurring/v3/agreements${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'list agreements');
    }

    return response.json();
  }

  /**
   * Create recurring payment agreement
   * Returns agreement ID and checkout URL for user approval
   */
  async createAgreement(params: VippsCreateAgreementParams): Promise<{
    agreementId: string;
    vippsConfirmationUrl: string;
    chargeId?: string;
  }> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key
    const idempotencyKey = `agreement-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const body = {
      productName: params.productName,
      productDescription: params.productDescription,
      pricing: {
        type: 'LEGACY',
        amount: params.price,
        currency: 'NOK',
      },
      interval: {
        unit: 'MONTH',
        count: 1,
      },
      merchantRedirectUrl: params.merchantRedirectUrl,
      merchantAgreementUrl: params.merchantAgreementUrl,      
      initialCharge: {
          amount: params.price,
          currency: 'NOK',
          description: params.productDescription,
          transactionType: 'DIRECT_CAPTURE',
        }
    };

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'create agreement');
    }

    return response.json();
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
    const headers = await this.baseClient.getCommonHeaders();

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'get agreement');
    }

    return response.json();
  }

  /**
   * Stop agreement (cancel subscription)
   */
  async stopAgreement(agreementId: string): Promise<void> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key
    const idempotencyKey = `stop-${agreementId}-${Date.now()}`;

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          status: 'STOPPED',
        }),
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'stop agreement');
    }
  }

  /**
   * Force accept an agreement (TEST ENVIRONMENT ONLY)
   * Used for automated testing without user interaction in the app
   *
   * @param agreementId - Agreement ID to force accept
   * @param phoneNumber - Customer phone number (format: '4712345678')
   */
  async forceAcceptAgreement(agreementId: string, phoneNumber: string): Promise<void> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key
    const idempotencyKey = `accept-${agreementId}-${Date.now()}`;

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}/accept`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          phoneNumber,
        }),
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'force accept agreement');
    }
  }

  // ---------------------------------------------------------------------------
  // CHARGES
  // ---------------------------------------------------------------------------

  /**
   * Create charge on agreement (scheduled recurring payment)
   * Default: DIRECT_CAPTURE (immediate payment)
   * Optional: RESERVE_CAPTURE (two-step: reserve then capture)
   */
  async createCharge(agreementId: string, params: VippsCreateChargeParams): Promise<{
    chargeId: string;
  }> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key to prevent duplicate charges
    const idempotencyKey = `${agreementId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const body = {
      amount: params.amount,
      currency: 'NOK',
      description: params.description,
      due: params.due,
      retryDays: params.retryDays,
      transactionType: params.transactionType || 'DIRECT_CAPTURE', // Default: DIRECT_CAPTURE for recurring
      type: 'RECURRING',
    };

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}/charges`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'create charge');
    }

    return response.json();
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
    const headers = await this.baseClient.getCommonHeaders();

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'get charge');
    }

    return response.json();
  }

  /**
   * Get charge by ID only (without knowing agreement ID)
   * This is a special endpoint useful for investigating customer claims
   * NOT intended for automation - use getCharge() for normal operations
   */
  async getChargeById(chargeId: string): Promise<{
    id: string;
    agreementId: string;
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
    const headers = await this.baseClient.getCommonHeaders();

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/charges/${chargeId}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'get charge by id');
    }

    return response.json();
  }

  /**
   * Capture reserved charge (ONLY for RESERVE_CAPTURE flow)
   * NOT needed for DIRECT_CAPTURE (default for recurring payments)
   * Must be called after charge status becomes RESERVED
   * Supports full or partial capture
   */
  async captureCharge(agreementId: string, chargeId: string, params: VippsCaptureChargeParams): Promise<void> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key for capture operation
    const idempotencyKey = `capture-${chargeId}-${Date.now()}`;

    const body = {
      amount: params.amount,
      description: params.description,
    };

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}/charges/${chargeId}/capture`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'capture charge');
    }

    // Capture endpoint returns HTTP 204 No Content on success
  }

  /**
   * Cancel charge (only for PENDING, DUE, or RESERVED status)
   */
  async cancelCharge(agreementId: string, chargeId: string): Promise<void> {
    const headers = await this.baseClient.getCommonHeaders();

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'cancel charge');
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create Vipps Recurring client with environment configuration
 */
export function createVippsRecurringClient(): VippsRecurringClient {
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
