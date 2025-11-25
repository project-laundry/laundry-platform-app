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

-- Seed test cleaners for NooraCare
-- Note: These test cleaners are all located in Bergen, verified/approved, with mixed business types

-- Step 1: Insert auth.users for cleaners
-- Using hardcoded UUIDs for predictable test data
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'cleaner1@test.no',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"phone": "+4798765001", "full_name": "Lars Johansen"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'cleaner2@test.no',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"phone": "+4798765002", "full_name": "Kari Olsen"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'cleaner3@test.no',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"phone": "+4798765003", "full_name": "Bergen Vaskeri AS"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'cleaner4@test.no',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"phone": "+4798765004", "full_name": "Anna Andersen"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  ),
  (
    'c5555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'cleaner5@test.no',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"phone": "+4798765005", "full_name": "Rene Vask"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  );

-- Step 2: Update users.role to 'cleaner'
-- The trigger creates users with role='customer' by default
UPDATE users SET role = 'cleaner'
WHERE id IN (
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'c4444444-4444-4444-4444-444444444444',
  'c5555555-5555-5555-5555-555555555555'
);

-- Step 3: Insert addresses for cleaners (base_address_id)
-- All addresses in Bergen with realistic coordinates
INSERT INTO addresses (
  id,
  user_id,
  label,
  street,
  postal_code,
  city,
  country,
  latitude,
  longitude,
  is_default,
  created_at,
  updated_at
) VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'Hjem',
    'Nedre Korskirkeallmenningen 5',
    '5017',
    'Bergen',
    'Norway',
    60.3951,
    5.3235,
    true,
    now(),
    now()
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    'Hjem',
    'Bryggen 15',
    '5003',
    'Bergen',
    'Norway',
    60.3975,
    5.3241,
    true,
    now(),
    now()
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    'Kontor',
    'Åsane Senter 12',
    '5116',
    'Bergen',
    'Norway',
    60.4643,
    5.3245,
    true,
    now(),
    now()
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    'c4444444-4444-4444-4444-444444444444',
    'Hjem',
    'Fanaveien 25',
    '5244',
    'Bergen',
    'Norway',
    60.2897,
    5.2956,
    true,
    now(),
    now()
  ),
  (
    'a5555555-5555-5555-5555-555555555555',
    'c5555555-5555-5555-5555-555555555555',
    'Kontor',
    'Laksevåg Torg 8',
    '5160',
    'Bergen',
    'Norway',
    60.3756,
    5.2834,
    true,
    now(),
    now()
  );

-- Step 4: Insert cleaners with detailed profiles
INSERT INTO cleaners (
  user_id,
  display_name,
  profile_image_url,
  bio,
  verification_status,
  business_type,
  tax_id,
  business_name,
  business_address,
  bank_account,
  base_address_id,
  experience_level,
  languages,
  specializations,
  weekly_schedule,
  is_accepting_orders,
  approved_at,
  created_at,
  updated_at
) VALUES
  -- Cleaner 1: Lars Johansen - Individual, Beginner
  (
    'c1111111-1111-1111-1111-111111111111',
    'Lars Johansen',
    NULL,
    'Nybegynner innen vask, men veldig nøye og pålitelig. Tar meg god tid for å sikre at alt blir perfekt.',
    'approved',
    'individual',
    '12345678901',
    NULL,
    NULL,
    '12345678901',
    'a1111111-1111-1111-1111-111111111111',
    'beginner',
    ARRAY['no'],
    ARRAY['delicate', 'formal']::cleaner_specialization[],
    '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}'::jsonb,
    true,
    now(),
    now(),
    now()
  ),
  -- Cleaner 2: Kari Olsen - Individual, Experienced
  (
    'c2222222-2222-2222-2222-222222222222',
    'Kari Olsen',
    NULL,
    'Erfaren vasker med spesialkompetanse på ull og silke. Har vasket klær i Bergen i over 5 år.',
    'approved',
    'individual',
    '23456789012',
    NULL,
    NULL,
    '23456789012',
    'a2222222-2222-2222-2222-222222222222',
    'experienced',
    ARRAY['no', 'en'],
    ARRAY['wool', 'silk', 'down']::cleaner_specialization[],
    '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": true, "sun": false}'::jsonb,
    true,
    now(),
    now(),
    now()
  ),
  -- Cleaner 3: Bergen Vaskeri AS - Business, Professional
  (
    'c3333333-3333-3333-3333-333333333333',
    'Bergen Vaskeri AS',
    NULL,
    'Profesjonelt vaskeri med 15 års erfaring. Spesialiserer oss på sportsklær, lær og yttertøy.',
    'approved',
    'business',
    '987654321',
    'Bergen Vaskeri AS',
    'Åsane Senter 12, 5116 Bergen',
    '34567890123',
    'a3333333-3333-3333-3333-333333333333',
    'professional',
    ARRAY['no', 'en', 'pl'],
    ARRAY['sportswear', 'leather', 'outerwear']::cleaner_specialization[],
    '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": true, "sun": true}'::jsonb,
    true,
    now(),
    now(),
    now()
  ),
  -- Cleaner 4: Anna Andersen - Individual, Expert
  (
    'c4444444-4444-4444-4444-444444444444',
    'Anna Andersen',
    NULL,
    'Ekspert på finvask og delikate stoffer. Tar spesielt godt vare på silke og formelle plagg.',
    'approved',
    'individual',
    '45678901234',
    NULL,
    NULL,
    '45678901234',
    'a4444444-4444-4444-4444-444444444444',
    'expert',
    ARRAY['no', 'en'],
    ARRAY['silk', 'delicate', 'formal']::cleaner_specialization[],
    '{"mon": true, "tue": false, "wed": true, "thu": false, "fri": true, "sat": false, "sun": false}'::jsonb,
    true,
    now(),
    now(),
    now()
  ),
  -- Cleaner 5: Rene Vask - Business, Professional
  (
    'c5555555-5555-5555-5555-555555555555',
    'Rene Vask',
    NULL,
    'Moderne vaskeri med fokus på miljøvennlige metoder. Eksperter på ull, dun og sportsklær.',
    'approved',
    'business',
    '876543210',
    'Rene Vask AS',
    'Laksevåg Torg 8, 5160 Bergen',
    '56789012345',
    'a5555555-5555-5555-5555-555555555555',
    'professional',
    ARRAY['no'],
    ARRAY['wool', 'down', 'sportswear']::cleaner_specialization[],
    '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}'::jsonb,
    true,
    now(),
    now(),
    now()
  );
