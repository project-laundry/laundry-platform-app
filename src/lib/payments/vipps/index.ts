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

// =============================================================================
// SERVICE LAYER
// =============================================================================

export {
  // Recurring API (Subscriptions)
  createVippsAgreement,
  captureVippsCharge,
  cancelVippsAgreement,
  createChargeForCompletedOrder,
  type CreateAgreementResult,
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
