-- Remove phone format validation constraint from users table
-- This allows phone numbers in any format, not just Norwegian +47XXXXXXXX

ALTER TABLE users DROP CONSTRAINT users_phone_format;
