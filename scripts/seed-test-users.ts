import { config } from 'dotenv';
import { resolve } from 'path';
import { createAdminClient } from './lib/admin-client';
import { generateRandomCleaner } from './lib/test-user-data';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

async function seedTestUsers() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const cityArg = args.find((arg) => arg.startsWith('--city='));
  const typeArg = args.find((arg) => arg.startsWith('--type='));

  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 5;
  const city = (cityArg?.split('=')[1] as 'Bergen' | 'Oslo') || 'Bergen';
  const type = (typeArg?.split('=')[1] as 'individual' | 'business' | 'mixed') || 'individual';

  if (isNaN(count) || count < 1 || count > 50) {
    console.error('❌ Invalid count. Please provide a number between 1 and 50.');
    process.exit(1);
  }

  if (city !== 'Bergen' && city !== 'Oslo') {
    console.error('❌ Invalid city. Please use "Bergen" or "Oslo".');
    process.exit(1);
  }

  if (type !== 'individual' && type !== 'business' && type !== 'mixed') {
    console.error('❌ Invalid type. Please use "individual", "business", or "mixed".');
    process.exit(1);
  }

  console.log(`🌱 Starting test user seeding...`);
  console.log(`📍 City: ${city}`);
  console.log(`🏢 Type: ${type}`);
  console.log(`👥 Count: ${count}\n`);

  const adminClient = createAdminClient();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const testCleaner = generateRandomCleaner(city, type);

    try {
      console.log(`[${i + 1}/${count}] Creating user: ${testCleaner.email}`);

      // Step 1: Create auth user with Admin API
      const { data: authUser, error: authError } =
        await adminClient.auth.admin.createUser({
          email: testCleaner.email,
          password: testCleaner.password,
          email_confirm: true,
          user_metadata: {
            phone: testCleaner.phone,
            full_name: testCleaner.full_name,
          },
        });

      if (authError) {
        throw authError;
      }

      const userId = authUser.user.id;
      console.log(`  ✅ Auth user created`);

      // Step 2: Wait for trigger to create public.users record
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Update role to 'cleaner'
      const { error: roleError } = await adminClient
        .from('users')
        .update({ role: 'cleaner' })
        .eq('id', userId);

      if (roleError) {
        throw roleError;
      }

      console.log(`  ✅ Role updated to cleaner`);

      // Step 4: Insert address
      const { data: addressData, error: addressError } = await adminClient
        .from('addresses')
        .insert({
          user_id: userId,
          label: testCleaner.address.label,
          street: testCleaner.address.street,
          postal_code: testCleaner.address.postal_code,
          city: testCleaner.address.city,
          country: testCleaner.address.country,
          latitude: testCleaner.address.latitude,
          longitude: testCleaner.address.longitude,
          is_default: true,
        })
        .select()
        .single();

      if (addressError || !addressData) {
        throw addressError || new Error('Failed to create address');
      }

      console.log(`  ✅ Address created`);

      // Step 5: Create cleaner profile
      const { error: cleanerError } = await adminClient
        .from('cleaners')
        .insert({
          user_id: userId,
          display_name: testCleaner.cleaner_profile.display_name,
          bio: testCleaner.cleaner_profile.bio,
          verification_status: testCleaner.cleaner_profile.verification_status,
          business_type: testCleaner.cleaner_profile.business_type,
          tax_id: testCleaner.cleaner_profile.tax_id,
          business_name: testCleaner.cleaner_profile.business_name,
          business_address: testCleaner.cleaner_profile.business_address,
          bank_account: testCleaner.cleaner_profile.bank_account,
          base_address_id: addressData.id,
          experience_level: testCleaner.cleaner_profile.experience_level,
          languages: testCleaner.cleaner_profile.languages,
          specializations: testCleaner.cleaner_profile.specializations,
          weekly_schedule: testCleaner.cleaner_profile.weekly_schedule,
          is_accepting_orders: true,
          approved_at: new Date().toISOString(),
        });

      if (cleanerError) {
        throw cleanerError;
      }

      console.log(`  ✅ Cleaner profile created`);
      console.log(`  🎉 Successfully created ${testCleaner.full_name}\n`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error creating user:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Created: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Execute
seedTestUsers()
  .then(() => {
    console.log('\n✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
