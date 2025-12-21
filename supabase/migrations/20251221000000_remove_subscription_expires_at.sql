-- Remove expires_at field from subscriptions table
-- Expiration is managed by Vipps Recurring API, not our database

-- Drop the check constraint first
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_expires_after_started;

-- Drop the expires_at column
ALTER TABLE subscriptions
DROP COLUMN expires_at;
