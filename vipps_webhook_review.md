# Vipps Webhook API Implementation Review

**Date:** 2025-12-11
**File Reviewed:** `src/app/api/webhooks/vipps/route.ts`
**Documentation Source:** Vipps MobilePay Developer Documentation

---

## Executive Summary

The current Vipps webhook implementation has **critical discrepancies** with the official Vipps API contract. The webhook payload structure, event type naming, and authentication method do not match Vipps specifications.

**Status:** ❌ **NOT PRODUCTION-READY** - Requires immediate updates

---

## Critical Issues

### 1. ❌ **Incorrect Event Type Names**

**Current Implementation:**
```typescript
event: 'CHARGE_CREATED' | 'CHARGE_UPDATED' | 'AGREEMENT_UPDATED'
```

**Official Vipps Contract:**
- **Charge Events:** `recurring.charge-reserved.v1`, `recurring.charge-captured.v1`, `recurring.charge-canceled.v1`, `recurring.charge-refunded.v1`, `recurring.charge-failed.v1`, `recurring.charge-creation-failed.v1`
- **Agreement Events:** `recurring.agreement-activated.v1`, `recurring.agreement-rejected.v1`, `recurring.agreement-stopped.v1`, `recurring.agreement-expired.v1`

**Impact:** 🔴 **CRITICAL** - Webhooks will never match, handler will never execute

---

### 2. ❌ **Missing Required Payload Fields**

**Current Implementation:**
```typescript
interface VippsWebhookBody {
  msn: string;
  timestamp: string;
  event: string;
  agreementId: string;
  chargeId?: string;
}
```

**Official Vipps Contract for Charge Events:**
```typescript
{
  agreementId: string;              // ✅ Present
  chargeExternalId?: string;        // ❌ Missing
  chargeId: string;                 // ✅ Present
  amount: number;                   // ❌ Missing
  chargeType: 'RECURRING' | 'INITIAL' | 'UNSCHEDULED';  // ❌ Missing
  eventType: string;                // ✅ Present (as 'event')
  currency: 'DKK' | 'NOK' | 'EUR';  // ❌ Missing
  occurred: string;                 // ❌ Missing (timestamp exists but different name)
  amountCaptured?: number;          // ❌ Missing
  amountCanceled?: number;          // ❌ Missing
  amountRefunded?: number;          // ❌ Missing
  failureCode?: number;             // ❌ Missing
  failureReason?: string;           // ❌ Missing
  msn: string;                      // ✅ Present
}
```

**Official Vipps Contract for Agreement Events:**
```typescript
{
  agreementId: string;              // ✅ Present
  agreementUUID: string;            // ❌ Missing
  agreementExternalId?: string;     // ❌ Missing
  eventType: string;                // ✅ Present (as 'event')
  occurred: string;                 // ❌ Missing (timestamp exists)
  actor?: 'MERCHANT' | 'USER' | 'ADMIN';  // ❌ Missing
  msn: string;                      // ✅ Present
}
```

**Impact:** 🔴 **CRITICAL** - Missing data needed for proper payment processing

---

### 3. ⚠️ **Potentially Incorrect Authentication Method**

**Current Implementation:**
```typescript
// Expected format: "Basic base64(client_id:client_secret)"
const expectedAuth = `Basic ${Buffer.from(
  `${process.env.VIPPS_CLIENT_ID}:${process.env.VIPPS_CLIENT_SECRET}`
).toString('base64')}`;
```

**Concern:** Vipps documentation does not explicitly state that webhooks use Basic Auth with client credentials. This needs verification.

**Standard Vipps Pattern:** Most Vipps webhooks use:
- Bearer token authentication OR
- Webhook-specific secret/signature validation

**Impact:** 🟡 **HIGH** - May reject legitimate Vipps webhook calls or accept unauthorized requests

---

### 4. ❌ **Incomplete Charge Status Handling**

**Current Implementation:**
```typescript
switch (charge.status) {
  case 'RESERVED':  // ✅ Handles
  case 'CHARGED':   // ✅ Handles
  case 'FAILED':    // ✅ Handles
  default:          // Logs and ignores
}
```

**Missing Event Types:**
- `recurring.charge-canceled.v1` - Charge was cancelled
- `recurring.charge-refunded.v1` - Charge was refunded
- `recurring.charge-creation-failed.v1` - Charge failed to be created

**Impact:** 🟡 **HIGH** - Cannot handle refunds or cancellations properly

---

### 5. ❌ **Incomplete Agreement Status Handling**

**Current Implementation:**
```typescript
// Only handles STOPPED status
if (agreement.status === 'STOPPED' && subscription.status === 'active') {
  // Cancel subscription (not implemented)
}
```

**Missing Event Types:**
- `recurring.agreement-activated.v1` - Agreement accepted by user
- `recurring.agreement-rejected.v1` - Agreement rejected by user
- `recurring.agreement-expired.v1` - Agreement expired

**Impact:** 🟡 **HIGH** - Cannot properly track agreement lifecycle

---

### 6. ⚠️ **Mixing Webhook Events with API Calls**

**Current Implementation:**
The handler makes API calls to Vipps (`getCharge()`, `getAgreement()`) to fetch data on every webhook event.

**Vipps Best Practice:**
All necessary data is included in the webhook payload. API calls should only be made when absolutely necessary (e.g., retries, auditing).

**Impact:** 🟡 **MEDIUM** - Unnecessary API calls, slower webhook processing, potential rate limiting

---

## Recommendations

### Priority 1: Fix Event Type Contract (CRITICAL)

**Update webhook interface:**
```typescript
// Charge webhook events
type VippsChargeEvent =
  | 'recurring.charge-reserved.v1'
  | 'recurring.charge-captured.v1'
  | 'recurring.charge-canceled.v1'
  | 'recurring.charge-refunded.v1'
  | 'recurring.charge-failed.v1'
  | 'recurring.charge-creation-failed.v1';

// Agreement webhook events
type VippsAgreementEvent =
  | 'recurring.agreement-activated.v1'
  | 'recurring.agreement-rejected.v1'
  | 'recurring.agreement-stopped.v1'
  | 'recurring.agreement-expired.v1';

interface VippsChargeWebhookBody {
  agreementId: string;
  chargeExternalId?: string;
  chargeId: string;
  amount: number;
  chargeType: 'RECURRING' | 'INITIAL' | 'UNSCHEDULED';
  eventType: VippsChargeEvent;
  currency: 'DKK' | 'NOK' | 'EUR';
  occurred: string;
  amountCaptured?: number;
  amountCanceled?: number;
  amountRefunded?: number;
  failureCode?: number;
  failureReason?: string;
  msn: string;
}

interface VippsAgreementWebhookBody {
  agreementId: string;
  agreementUUID: string;
  agreementExternalId?: string;
  eventType: VippsAgreementEvent;
  occurred: string;
  actor?: 'MERCHANT' | 'USER' | 'ADMIN';
  msn: string;
}

type VippsWebhookBody = VippsChargeWebhookBody | VippsAgreementWebhookBody;
```

---

### Priority 2: Update Event Handling Logic (CRITICAL)

**Replace the switch statement:**
```typescript
// OLD: switch (event)
// NEW: switch (body.eventType)

switch (body.eventType) {
  // Charge events
  case 'recurring.charge-reserved.v1':
    await handleChargeReserved(body as VippsChargeWebhookBody, subscription);
    break;

  case 'recurring.charge-captured.v1':
    await handleChargeCaptured(body as VippsChargeWebhookBody, subscription);
    break;

  case 'recurring.charge-canceled.v1':
    await handleChargeCanceled(body as VippsChargeWebhookBody, subscription);
    break;

  case 'recurring.charge-refunded.v1':
    await handleChargeRefunded(body as VippsChargeWebhookBody, subscription);
    break;

  case 'recurring.charge-failed.v1':
    await handleChargeFailed(body as VippsChargeWebhookBody, subscription);
    break;

  case 'recurring.charge-creation-failed.v1':
    await handleChargeCreationFailed(body as VippsChargeWebhookBody, subscription);
    break;

  // Agreement events
  case 'recurring.agreement-activated.v1':
    await handleAgreementActivated(body as VippsAgreementWebhookBody, subscription);
    break;

  case 'recurring.agreement-rejected.v1':
    await handleAgreementRejected(body as VippsAgreementWebhookBody, subscription);
    break;

  case 'recurring.agreement-stopped.v1':
    await handleAgreementStopped(body as VippsAgreementWebhookBody, subscription);
    break;

  case 'recurring.agreement-expired.v1':
    await handleAgreementExpired(body as VippsAgreementWebhookBody, subscription);
    break;

  default:
    console.log(`[Vipps Webhook] Unknown event type: ${body.eventType}`);
}
```

---

### Priority 3: Verify Authentication Method (HIGH)

**Action Required:**
1. Check Vipps merchant portal for webhook configuration
2. Verify what authentication method Vipps actually uses for webhooks
3. Update `isValidVippsWebhook()` accordingly

**Common Vipps webhook authentication patterns:**
- **Bearer token** (most common for webhooks)
- **HMAC signature** validation
- **Webhook-specific secret**

---

### Priority 4: Use Webhook Payload Data Directly (MEDIUM)

**Instead of making API calls:**
```typescript
// OLD: Fetch charge from API
const charge = await vipps.getCharge(agreementId, chargeId);

// NEW: Use webhook payload data directly
const { amount, chargeType, currency, amountCaptured, amountCanceled, amountRefunded } = body;
```

**Only make API calls when:**
- Debugging/auditing
- Webhook data is missing critical information
- Need to verify webhook authenticity

---

### Priority 5: Handle All Event Types (HIGH)

**Add handlers for:**
- `recurring.charge-canceled.v1` - Update payment status, handle partial cancellations
- `recurring.charge-refunded.v1` - Process refunds, update payment records
- `recurring.agreement-activated.v1` - Confirm agreement is active (initial setup)
- `recurring.agreement-rejected.v1` - Handle user rejection of agreement
- `recurring.agreement-expired.v1` - Clean up expired agreements

---

## Testing Recommendations

### 1. Webhook Testing Setup
- Use Vipps test environment (apitest.vipps.no)
- Configure webhook URL in Vipps merchant portal
- Test all event types listed above

### 2. Payload Validation
- Log all incoming webhook payloads
- Verify they match the documented structure
- Check for any undocumented fields

### 3. Authentication Testing
- Test with correct credentials
- Test with incorrect credentials (should reject)
- Test with missing Authorization header (should reject)

---

## Migration Path

1. **Phase 1:** Update webhook interface and types (no breaking changes)
2. **Phase 2:** Add logging to capture real Vipps webhook payloads
3. **Phase 3:** Verify authentication method with Vipps support
4. **Phase 4:** Update event handling logic with new event types
5. **Phase 5:** Test thoroughly in Vipps test environment
6. **Phase 6:** Deploy to production with monitoring

---

## Additional Notes

### Vipps API Changes (November 2024)
- Webhooks now include `msn` field (Merchant Serial Number)
- This is already captured in current implementation ✅

### Important Vipps Behavior
- `recurring.charge-reserved.v1` is **NOT sent** for `DIRECT_CAPTURE` transactions
- `recurring.agreement-stopped.v1` includes `actor` field indicating who stopped it (USER, MERCHANT, ADMIN)
- Reserved charges are not automatically cancelled when agreement is stopped
- Pending/DUE charges are cancelled when agreement is stopped

---

## Summary of Action Items

| Priority | Action | Estimated Effort | Impact |
|----------|--------|-----------------|--------|
| 🔴 P1 | Fix event type names | 2 hours | Critical |
| 🔴 P1 | Update payload interface | 2 hours | Critical |
| 🔴 P1 | Update event handling logic | 4 hours | Critical |
| 🟡 P2 | Verify authentication method | 1 hour | High |
| 🟡 P2 | Add missing event handlers | 4 hours | High |
| 🟢 P3 | Use payload data directly | 2 hours | Medium |
| 🟢 P3 | Add comprehensive testing | 4 hours | Medium |

**Total Estimated Effort:** 19 hours

---

## References

- [Vipps Recurring API Guide](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide)
- [Vipps Webhook Events Documentation](https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/events)
- [Vipps Technical Updates (2024)](https://developer.vippsmobilepay.com/docs/technical-updates/)
