// Vipps ePayment API Client
// Implements one-time payment flow for standalone orders
// API Reference: /epayment/v1/*

import { VippsBaseClient, type VippsConfig } from './base-client';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Parameters for creating a Vipps ePayment
 * Based on Vipps ePayment API v1 specification
 */
export interface VippsCreatePaymentParams {
  reference: string; // Unique merchant reference (8-64 chars)
  amount: number; // in øre (1 NOK = 100 øre)
  paymentDescription: string; // 3-100 chars
  userFlow: 'WEB_REDIRECT' | 'PUSH_MESSAGE' | 'NATIVE_REDIRECT' | 'QR';
  returnUrl?: string; // Required for WEB_REDIRECT
  customer?: {
    phoneNumber?: string; // Optional, MSISDN format (e.g., 4712345678)
  };
  paymentMethod: {
    type: 'WALLET' | 'CARD';
  };
}

/**
 * Response from createPayment
 */
export interface VippsCreatePaymentResponse {
  reference: string; // Merchant reference
  redirectUrl?: string; // URL to redirect user (not present for PUSH_MESSAGE)
}

/**
 * Payment state from getPayment
 */
export type VippsPaymentState = 'CREATED' | 'ABORTED' | 'EXPIRED' | 'AUTHORIZED' | 'TERMINATED';

/**
 * Payment aggregate amounts
 */
export interface VippsPaymentAggregate {
  authorizedAmount: {
    value: number; // in øre
    currency: string;
  };
  cancelledAmount: {
    value: number;
    currency: string;
  };
  capturedAmount: {
    value: number;
    currency: string;
  };
  refundedAmount: {
    value: number;
    currency: string;
  };
}

/**
 * Full payment details from getPayment
 */
export interface VippsPaymentDetails {
  reference: string; // Merchant reference
  pspReference: string; // Vipps internal reference
  state: VippsPaymentState;
  amount: {
    value: number; // in øre
    currency: string;
  };
  aggregate: VippsPaymentAggregate;
  paymentMethod: {
    type: 'WALLET' | 'CARD';
  };
}

/**
 * Parameters for capturing a payment
 */
export interface VippsCapturePaymentParams {
  amount: number; // in øre (can be less than authorized for partial capture)
  description?: string; // Optional description for capture
}

/**
 * Response from capturePayment
 */
export interface VippsCapturePaymentResponse {
  reference: string;
  pspReference: string;
  amount: {
    value: number;
    currency: string;
  };
  state: VippsPaymentState;
  aggregate: VippsPaymentAggregate;
}

// =============================================================================
// VIPPS EPAYMENT API CLIENT
// =============================================================================

/**
 * Client for Vipps ePayment API v1
 * Handles one-time payments for standalone orders
 *
 * Uses composition pattern with VippsBaseClient for shared auth/HTTP utilities
 */
export class VippsEPaymentClient {
  private baseClient: VippsBaseClient;

  constructor(config: VippsConfig) {
    this.baseClient = new VippsBaseClient(config);
  }

  // ---------------------------------------------------------------------------
  // PAYMENT CREATION
  // ---------------------------------------------------------------------------

  /**
   * Create one-time payment
   * Returns payment reference and redirect URL for user approval
   *
   * @param params - Payment creation parameters
   * @returns Payment reference and redirect URL
   */
  async createPayment(params: VippsCreatePaymentParams): Promise<VippsCreatePaymentResponse> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = `${params.reference}-${Date.now()}`;

    const body = {
      amount: {
        value: params.amount,
        currency: 'NOK',
      },
      paymentMethod: params.paymentMethod,
      customer: params.customer,
      reference: params.reference,
      userFlow: params.userFlow,
      returnUrl: params.returnUrl,
      paymentDescription: params.paymentDescription,
    };

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/epayment/v1/payments`,
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
      await this.baseClient.handleVippsError(response, 'create payment');
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // PAYMENT QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Get payment details by merchant reference
   *
   * @param reference - Merchant reference used when creating payment
   * @returns Full payment details including status and aggregate amounts
   */
  async getPayment(reference: string): Promise<VippsPaymentDetails> {
    const headers = await this.baseClient.getCommonHeaders();

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/epayment/v1/payments/${reference}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      await this.baseClient.handleVippsError(response, 'get payment');
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // PAYMENT CAPTURE
  // ---------------------------------------------------------------------------

  /**
   * Capture authorized payment
   * Must be called after payment is AUTHORIZED
   * Supports full or partial capture
   *
   * @param reference - Merchant reference
   * @param params - Capture parameters (amount)
   * @returns Capture response with updated aggregate
   */
  async capturePayment(
    reference: string,
    params: VippsCapturePaymentParams
  ): Promise<VippsCapturePaymentResponse> {
    const headers = await this.baseClient.getCommonHeaders();

    // Generate idempotency key for capture operation
    const idempotencyKey = `capture-${reference}-${Date.now()}`;

    const body = {
      modificationAmount: {
        value: params.amount,
        currency: 'NOK',
      },
    };

    const response = await fetch(
      `${this.baseClient.getBaseUrl()}/epayment/v1/payments/${reference}/capture`,
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
      await this.baseClient.handleVippsError(response, 'capture payment');
    }

    return response.json();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create Vipps ePayment client with environment configuration
 */
export function createVippsEPaymentClient(): VippsEPaymentClient {
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

  return new VippsEPaymentClient({
    clientId: process.env.VIPPS_CLIENT_ID!,
    clientSecret: process.env.VIPPS_CLIENT_SECRET!,
    subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY!,
    merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER!,
    baseUrl: process.env.VIPPS_API_URL || 'https://apitest.vipps.no', // Default to test environment
  });
}
