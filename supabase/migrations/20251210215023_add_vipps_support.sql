-- Migration: Add Vipps Recurring Payment Support
-- Description: Adds columns to subscriptions table for storing Vipps agreement IDs and metadata
-- Date: 2025-02-10

-- Add Vipps-specific columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN provider_agreement_id VARCHAR(255) UNIQUE,
ADD COLUMN provider_agreement_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.provider_agreement_id IS
'External payment provider agreement ID (e.g., Vipps agreement ID like agr_Abc123)';

COMMENT ON COLUMN subscriptions.provider_agreement_metadata IS
'Provider-specific agreement metadata stored as JSONB for flexibility. Structure: {"vipps_agreement_id": "agr_xxx", "vipps_initial_charge_id": "chr_xxx", "agreement_status": "ACTIVE", "created_at": "ISO8601"}';

-- Create index for fast lookups by agreement ID
CREATE INDEX idx_subscriptions_provider_agreement_id
ON subscriptions(provider_agreement_id)
WHERE provider_agreement_id IS NOT NULL;

-- Add index for querying active Vipps subscriptions (used by billing scheduler)
CREATE INDEX idx_subscriptions_vipps_active_billing
ON subscriptions(status, next_billing_date, provider_agreement_id)
WHERE status = 'active' AND provider_agreement_id IS NOT NULL;
