// Vipps Payment Integration
// Clean exports for all Vipps APIs

// =============================================================================
// CLIENTS
// =============================================================================

export { VippsBaseClient, type VippsConfig } from './base-client';

export {
  VippsRecurringClient,
  createVippsRecurringClient,
} from './recurring-client';

export {
  VippsEPaymentClient,
  createVippsEPaymentClient,
  type VippsCreatePaymentParams,
  type VippsCreatePaymentResponse,
  type VippsPaymentState,
  type VippsPaymentDetails,
  type VippsPaymentAggregate,
  type VippsCapturePaymentParams,
  type VippsCapturePaymentResponse,
} from './epayment-client';

// =============================================================================
// SERVICE LAYER
// =============================================================================

export {
  // Recurring API (Subscriptions)
  createVippsAgreement,
  createRecurringChargeForSubscription,
  captureVippsCharge,
  cancelVippsAgreement,
  type CreateAgreementResult,
  // ePayment API (One-time Orders)
  createVippsEPayment,
  captureVippsEPayment,
  type CreateEPaymentResult,
} from './service';

// =============================================================================
// CONFIGURATION
// =============================================================================

export {
  validateVippsConfig,
  isVippsConfigured,
  getVippsEnvironment,
  isVippsTestEnvironment,
} from './config';
