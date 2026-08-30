import { config } from 'dotenv';
import { resolve } from 'path';
import { createAdminClient } from './lib/admin-client';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

interface TestCustomer {
  email: string;
  password: string;
  phone: string;
  full_name: string;
  address: {
    street: string;
    postal_code: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
}

const OSLO_STREETS = [
  { street: 'Karl Johans gate', numbers: [1, 50], postal: '0154', lat: 59.9139, lon: 10.7522 },
  { street: 'Storgata', numbers: [1, 60], postal: '0182', lat: 59.9127, lon: 10.7461 },
  { street: 'Grønland', numbers: [1, 40], postal: '0188', lat: 59.9103, lon: 10.7642 },
  { street: 'Bogstadveien', numbers: [1, 70], postal: '0366', lat: 59.9263, lon: 10.7185 },
  { street: 'Thorvald Meyers gate', numbers: [1, 80], postal: '0555', lat: 59.9223, lon: 10.7583 },
  { street: 'Sofienberggata', numbers: [1, 45], postal: '0558', lat: 59.9205, lon: 10.7621 },
];

const FIRST_NAMES = [
  'Lars', 'Kari', 'Ole', 'Anna', 'Erik', 'Ingrid', 'Per', 'Marit',
  'Jon', 'Liv', 'Arne', 'Solveig', 'Bjørn', 'Astrid', 'Kjell', 'Grete',
];

const LAST_NAMES = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen',
  'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen',
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber(): string {
  const prefix = randomElement(['47', '48', '98', '99', '90', '91', '92', '93', '94', '95']);
  const number = String(randomNumber(100000, 999999)).padStart(6, '0');
  return `+47${prefix}${number}`;
}

function generateTestCustomer(): TestCustomer {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

  const timestamp = Date.now();
  const random = randomNumber(1000, 9999);
  const email = `${emailName}.cust.${timestamp}.${random}@test.no`;

  const streetData = randomElement(OSLO_STREETS);
  const streetNumber = randomNumber(streetData.numbers[0], streetData.numbers[1]);
  const fullAddress = `${streetData.street} ${streetNumber}`;

  return {
    email,
    password: 'password123',
    phone: generatePhoneNumber(),
    full_name: fullName,
    address: {
      street: fullAddress,
      postal_code: streetData.postal,
      city: 'Oslo',
      country: 'Norway',
      latitude: streetData.lat + (Math.random() - 0.5) * 0.01,
      longitude: streetData.lon + (Math.random() - 0.5) * 0.01,
    },
  };
}

async function seedDriverTestOrders() {
  const args = process.argv.slice(2);
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 5;

  if (isNaN(count) || count < 1 || count > 50) {
    console.error('❌ Invalid count. Please provide a number between 1 and 50.');
    process.exit(1);
  }

  console.log(`🌱 Starting driver test order seeding...`);
  console.log(`📍 City: Oslo`);
  console.log(`👥 Customer count: ${count}\n`);

  const supabase = createAdminClient();
  let successCount = 0;
  let errorCount = 0;

  // Step 1: Find an Oslo cleaner (or use the first available approved cleaner)
  console.log('📦 Fetching cleaner for order assignment...');
  const { data: cleaners, error: cleanerError } = await supabase
    .from('cleaners')
    .select('id, user_id, display_name, base_city')
    .eq('verification_status', 'approved')
    .eq('base_city', 'Oslo')
    .limit(1);

  if (cleanerError || !cleaners || cleaners.length === 0) {
    console.error('❌ No approved cleaners found in Oslo');
    console.log('💡 Tip: Run `npm run seed:users -- --city=Oslo --count=1` first to create a test cleaner');
    process.exit(1);
  }

  const assignedCleaner = cleaners[0];
  console.log(`✅ Using cleaner: ${assignedCleaner.display_name} (${assignedCleaner.id})\n`);

  // Today's date in ISO format
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];

  for (let i = 0; i < count; i++) {
    const testCustomer = generateTestCustomer();

    try {
      console.log(`[${i + 1}/${count}] Creating customer: ${testCustomer.email}`);

      // Step 1: Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: testCustomer.email,
        password: testCustomer.password,
        email_confirm: true,
        user_metadata: {
          phone: testCustomer.phone,
          full_name: testCustomer.full_name,
        },
      });

      if (authError) {
        throw authError;
      }

      const userId = authUser.user.id;
      console.log(`  ✅ Auth user created`);

      // Step 2: Wait for trigger to create public.users record
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Update role to 'customer'
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'customer' })
        .eq('id', userId);

      if (roleError) {
        throw roleError;
      }

      console.log(`  ✅ Role updated to customer`);

      // Step 4: Create customer record
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
        })
        .select('id')
        .single();

      if (customerError || !customerData) {
        throw customerError || new Error('Failed to create customer record');
      }

      const customerId = customerData.id;
      console.log(`  ✅ Customer profile created`);

      // Step 5: Create order with status 'pickup_scheduled'
      const deliveryDate = new Date(today);
      deliveryDate.setDate(deliveryDate.getDate() + 3); // 3 days from now
      const deliveryISO = deliveryDate.toISOString().split('T')[0];

      // Generate a unique order number
      const orderNumber = `TST-${Date.now()}-${randomNumber(100, 999)}`;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          cleaner_id: assignedCleaner.id,
          status: 'pickup_scheduled',
          street: testCustomer.address.street,
          postal_code: testCustomer.address.postal_code,
          city: testCustomer.address.city,
          country: testCustomer.address.country,
          latitude: testCustomer.address.latitude,
          longitude: testCustomer.address.longitude,
          special_instructions_address: null,
          special_instructions: 'Test order - ready for driver pickup',
          scheduled_date: todayISO,
          delivery_date: deliveryISO,
          needs_ironing: Math.random() > 0.5,
          customer_estimate: {
            bags: Math.random() > 0.5 ? 2 : 3,
            bedding_sets: Math.random() > 0.7 ? 1 : 0,
            iron_everyday_items: false,
            iron_formal_items: false,
            iron_bedding: false,
            estimated_total_ore: null,
          },
          total_cost_ore: null,
          actual_weight_kg: null,
          pricing_notes: null,
          price_calculated_at: null,
          promo: null,
        })
        .select('id, order_number')
        .single();

      if (orderError || !orderData) {
        throw orderError || new Error('Failed to create order');
      }

      console.log(`  ✅ Order created: ${orderData.order_number}`);
      console.log(`  🎉 Successfully created ${testCustomer.full_name}\n`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error creating customer/order:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Created: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`\n📅 Orders scheduled for: ${todayISO}`);
  console.log(`🚗 All orders assigned to cleaner: ${assignedCleaner.display_name}`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Execute
seedDriverTestOrders()
  .then(() => {
    console.log('\n✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
