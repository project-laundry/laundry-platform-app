-- Cleaner onboarding no longer asks for languages or clothing specializations
-- (issue #66) — neither field was displayed anywhere outside onboarding.
-- Dropping languages also drops its cleaners_languages_not_empty CHECK
-- constraint automatically.
ALTER TABLE cleaners
  DROP COLUMN languages,
  DROP COLUMN specializations;

DROP TYPE cleaner_specialization;
