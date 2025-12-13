// Vipps Webhook Authentication Utility
// Shared HMAC-SHA256 signature verification for Vipps webhooks
// See: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/

import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Validate webhook request from Vipps using HMAC-SHA256 signature
 *
 * Vipps webhooks use HMAC-SHA256 for authentication:
 * 1. Verify content hash (x-ms-content-sha256)
 * 2. Construct signed string from method, path, and headers
 * 3. Verify HMAC signature
 *
 * @param request - The Next.js request object
 * @param body - The raw request body as string
 * @param webhookSecret - The webhook secret to use for validation
 * @param logPrefix - Optional prefix for console logs (default: '[Vipps Webhook]')
 * @returns true if webhook is valid, false otherwise
 */
export function validateVippsWebhook(
  request: NextRequest,
  body: string,
  webhookSecret: string | undefined,
  logPrefix: string = '[Vipps Webhook]'
): boolean {
  if (!webhookSecret) {
    console.error(`${logPrefix} Webhook secret not configured`);
    return false;
  }

  // Get required headers
  const authHeader = request.headers.get('authorization');
  const contentHashHeader = request.headers.get('x-ms-content-sha256');
  const dateHeader = request.headers.get('x-ms-date');
  const hostHeader = request.headers.get('host');

  if (!authHeader || !contentHashHeader || !dateHeader || !hostHeader) {
    console.error(`${logPrefix} Missing required headers`);
    return false;
  }

  // 1. Verify content hash
  const expectedContentHash = crypto
    .createHash('sha256')
    .update(body)
    .digest('base64');

  if (contentHashHeader !== expectedContentHash) {
    console.error(`${logPrefix} Content hash mismatch`);
    return false;
  }

  // 2. Construct signed string
  // Format: METHOD\nPATH_AND_QUERY\nx-ms-date;host;x-ms-content-sha256
  const url = new URL(request.url);
  const pathAndQuery = url.pathname + url.search;

  const signedString =
    `${request.method}\n` +
    `${pathAndQuery}\n` +
    `${dateHeader};${hostHeader};${contentHashHeader}`;

  // 3. Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedString)
    .digest('base64');

  const expectedAuth = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${expectedSignature}`;

  // 4. Compare with provided authorization header
  if (authHeader !== expectedAuth) {
    console.error(`${logPrefix} Signature verification failed`);
    console.error(`${logPrefix} Expected:`, expectedAuth);
    console.error(`${logPrefix} Received:`, authHeader);
    return false;
  }

  return true;
}

/**
 * Get webhook secret from environment variables
 * Supports both shared secret and endpoint-specific secrets
 *
 * Priority order:
 * 1. Endpoint-specific secret (e.g., VIPPS_WEBHOOK_SECRET_RECURRING)
 * 2. Shared secret (VIPPS_WEBHOOK_SECRET)
 *
 * @param endpoint - Optional endpoint name (e.g., 'recurring', 'epayment')
 * @returns Webhook secret or undefined if not found
 */
export function getVippsWebhookSecret(endpoint?: string): string | undefined {
  if (endpoint) {
    // Try endpoint-specific secret first
    const endpointSecret = process.env[`VIPPS_WEBHOOK_SECRET_${endpoint.toUpperCase()}`];
    if (endpointSecret) {
      return endpointSecret;
    }
  }

  // Fall back to shared secret
  return process.env.VIPPS_WEBHOOK_SECRET;
}
