# Seeding Scripts

This directory contains utility scripts for seeding test data into the NooraCare database.

## seed-test-users.ts

Creates random test cleaner users with realistic Norwegian data for development and testing.

### Quick Start

```bash
# Create 5 individual cleaners in Bergen (default)
npm run seed:test-users

# Create 10 businesses in Oslo
npm run seed:test-users -- --count=10 --city=Oslo --type=business

# Create 20 mixed cleaners in Bergen
npm run seed:test-users -- --count=20 --type=mixed
```

### Parameters

| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| `--count` | `5` | `1-50` | Number of test users to create |
| `--city` | `Bergen` | `Bergen`, `Oslo` | City for addresses and locations |
| `--type` | `individual` | `individual`, `business`, `mixed` | Type of cleaner to create |

### Parameter Details

#### `--count`
- Specifies how many test users to generate
- Minimum: 1, Maximum: 50
- Each run creates unique users (no duplicates)
- Default: 5

**Examples:**
```bash
npm run seed:test-users -- --count=10
npm run seed:test-users -- --count=25
```

#### `--city`
- Determines the city for addresses and coordinates
- `Bergen`: Creates cleaners with Bergen addresses (8 different streets)
- `Oslo`: Creates cleaners with Oslo addresses (6 different streets)
- Each address includes realistic postal codes and GPS coordinates
- Default: Bergen

**Examples:**
```bash
npm run seed:test-users -- --city=Bergen
npm run seed:test-users -- --city=Oslo
```

#### `--type`
- Controls whether users are individuals or businesses
- `individual`: Only creates individual cleaners (personal accounts)
- `business`: Only creates business cleaners (companies with business names)
- `mixed`: Random mix (~70% individuals, ~30% businesses)
- Default: individual

**Examples:**
```bash
npm run seed:test-users -- --type=individual
npm run seed:test-users -- --type=business
npm run seed:test-users -- --type=mixed
```

### Generated Data

The script generates realistic Norwegian test data including:

**User Information:**
- Random Norwegian first and last names (24 first names, 18 last names)
- Random business names for companies (9 business types + AS/DA suffix)
- Unique email addresses using timestamp + random number
- Norwegian phone numbers (+47 prefix with realistic mobile prefixes)
- Password: `password123` for all test users

**Addresses:**
- Realistic Bergen streets: Nedre Korskirkeallmenningen, Bryggen, Åsane Senter, etc.
- Realistic Oslo streets: Karl Johans gate, Storgata, Grønland, etc.
- Accurate postal codes for each area
- GPS coordinates with slight randomization for variety

**Cleaner Profiles:**
- Random experience levels: beginner, experienced, expert, professional
- 2-4 random specializations per cleaner (delicate, formal, wool, silk, down, sportswear, leather, outerwear)
- Languages: Always Norwegian, 50% chance of English, 20% chance of additional language
- Random weekly schedules (70% chance of working each weekday)
- Random Norwegian bios
- Tax IDs and bank account numbers (11-digit random numbers)
- Auto-approved and accepting orders

### Usage Examples

#### Basic Usage

Create default test data:
```bash
npm run seed:test-users
```
*Creates 5 individual cleaners in Bergen*

#### By City

Populate Bergen:
```bash
npm run seed:test-users -- --count=20 --city=Bergen
```

Populate Oslo:
```bash
npm run seed:test-users -- --count=15 --city=Oslo
```

Both cities:
```bash
npm run seed:test-users -- --count=10 --city=Bergen
npm run seed:test-users -- --count=10 --city=Oslo
```

#### By Type

Only individuals:
```bash
npm run seed:test-users -- --count=15 --type=individual
```

Only businesses:
```bash
npm run seed:test-users -- --count=8 --type=business
```

Mixed (for realistic distribution):
```bash
npm run seed:test-users -- --count=25 --type=mixed
```

#### Combined Parameters

Create 20 individual cleaners in Oslo:
```bash
npm run seed:test-users -- --count=20 --city=Oslo --type=individual
```

Create 10 businesses in Bergen:
```bash
npm run seed:test-users -- --count=10 --city=Bergen --type=business
```

Create diverse test data across both cities:
```bash
npm run seed:test-users -- --count=15 --city=Bergen --type=mixed
npm run seed:test-users -- --count=10 --city=Oslo --type=mixed
```

### Requirements

**Environment Variables:**

The script requires the following environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Getting the Service Role Key:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the `service_role` secret key (NOT the anon key)
4. Add it to `.env.local`

**Security Note:** The service role key bypasses Row Level Security (RLS) and should NEVER be exposed to client-side code. Only use it in server-side scripts.

### What the Script Does

For each test user, the script:

1. **Creates auth user** via Supabase Admin API
   - Sets email, password, and metadata
   - Auto-confirms email
   - Returns generated user ID

2. **Waits for trigger** (500ms)
   - Database trigger `handle_new_user()` creates `public.users` record
   - Extracts phone and full_name from metadata

3. **Updates role** to 'cleaner'
   - Default role is 'customer', we change it to 'cleaner'

4. **Creates address** record
   - Links to user via user_id
   - Includes GPS coordinates for mapping

5. **Creates cleaner profile**
   - Full professional details
   - Links to base address
   - Sets as approved and accepting orders

### Output

The script provides clear console output:

```
🌱 Starting test user seeding...
📍 City: Bergen
🏢 Type: individual
👥 Count: 5

[1/5] Creating user: lars.hansen.1732556789123.4567@test.no
  ✅ Auth user created
  ✅ Role updated to cleaner
  ✅ Address created
  ✅ Cleaner profile created
  🎉 Successfully created Lars Hansen

[2/5] Creating user: kari.olsen.1732556791456.8901@test.no
  ✅ Auth user created
  ✅ Role updated to cleaner
  ✅ Address created
  ✅ Cleaner profile created
  🎉 Successfully created Kari Olsen

...

📊 Summary:
  ✅ Created: 5
  ❌ Errors: 0

✨ Seeding complete!
```

### Error Handling

- Individual user failures don't stop the script
- Continues processing remaining users
- Reports summary at the end
- Exit code 1 if any errors occurred (useful for CI/CD)

### Credentials

All test users have the same password for easy testing:

**Password:** `password123`

**Example logins:**
- Any generated email + `password123`
- Test users can log in via the cleaner dashboard

### Notes

- **Idempotency:** Not idempotent - creates new users each time
- **No duplicates:** Each email includes timestamp + random number for uniqueness
- **Multiple runs:** Safe to run multiple times to create more users
- **Database cleanup:** Delete test users manually via Supabase dashboard if needed
- **Production:** DO NOT use in production - test data only

### Troubleshooting

**Error: Missing environment variables**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are in `.env.local`
- Check that service role key is correct (not the anon key)

**Error: Invalid count**
- Count must be between 1 and 50
- Use: `--count=N` where N is in valid range

**Error: Invalid city**
- City must be "Bergen" or "Oslo" (case-sensitive)
- Use: `--city=Bergen` or `--city=Oslo`

**Error: Invalid type**
- Type must be "individual", "business", or "mixed" (case-sensitive)
- Use: `--type=individual`, `--type=business`, or `--type=mixed`

**Error: Function handle_new_user() failed**
- Check that the trigger exists in your database
- See migration: `20251125000000_fix_user_creation_trigger.sql`
- May need to reset database: `supabase db reset --linked`

### Development

**File Structure:**
```
scripts/
├── README.md                 # This file
├── seed-test-users.ts        # Main script
└── lib/
    ├── admin-client.ts       # Supabase admin client factory
    └── test-user-data.ts     # Random data generators
```

**Modifying the Script:**

To add new data types or modify generation logic, edit:
- `scripts/lib/test-user-data.ts` - Add names, addresses, or change generation logic
- `scripts/seed-test-users.ts` - Add new parameters or change workflow

**Testing Changes:**
```bash
# Make changes to the script
# Run with small count first
npm run seed:test-users -- --count=1

# Check the created user in Supabase dashboard
# If successful, run with larger count
npm run seed:test-users -- --count=10
```
