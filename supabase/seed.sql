-- Seed subscription plans for NooraCare
INSERT INTO subscription_plans (
  slug, name, description, price_ore, billing_period,
  included_kg, features, frequency, is_popular, is_active, sort_order
) VALUES
  (
    'biweekly',
    'Annenhver uke',
    'Vaskes annenhver uke',
    24900,
    'monthly',
    5,
    ARRAY[
      'Henting annenhver uke',
      'Fast vaskedag hver 14. dag',
      'Inntil 5 kg tøy per henting',
      'SMS-varsling',
      'Standard vasketid (2-3 dager)',
      'Kan avbrytes når som helst'
    ],
    'biweekly',
    false,
    true,
    1
  ),
  (
    'weekly',
    'Ukentlig',
    'Vaskes hver uke',
    39900,
    'monthly',
    5,
    ARRAY[
      'Ukentlig henting og levering',
      'Fast vaskedag hver uke',
      'Inntil 5 kg tøy per henting',
      'SMS-varsling',
      'Prioritert behandling',
      'Kan avbrytes når som helst'
    ],
    'weekly',
    true,
    true,
    2
  ),
  (
    'single',
    'Enkeltvask',
    'Betal per vask',
    14900,
    'one_time',
    5,
    ARRAY[
      'Ingen abonnement',
      'Bestill når du trenger det',
      'Inntil 5 kg tøy per vask',
      'Standard vasketid (3-4 dager)',
      'SMS-varsling',
      'Ingen bindingstid'
    ],
    'on_demand',
    false,
    true,
    3
  );

-- Test users (cleaners) are created via scripts/seed-test-users.ts
-- Run: npm run seed:test-users
