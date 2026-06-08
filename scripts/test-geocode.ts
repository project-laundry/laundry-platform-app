import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local (same convention as other scripts)
config({ path: resolve(__dirname, '../.env.local') });

import { geocodeAddress, type AddressInput } from '../src/lib/maps/geocoding';
import { isMapsConfigured } from '../src/lib/maps/config';

// Usage:
//   npm run test:geocode
//   npm run test:geocode -- "Nygårdsgaten 5" 5015 Bergen
//   npm run test:geocode -- "Karl Johans gate 1" 0154 Oslo Norway
const [street, postalCode, city, country] = process.argv.slice(2);

const address: AddressInput = {
  street: street || 'Bryggen 1',
  postal_code: postalCode || '5003',
  city: city || 'Bergen',
  country: country || 'Norway',
};

async function main() {
  if (!isMapsConfigured()) {
    console.error('❌ GOOGLE_MAPS_API_KEY is not set in .env.local');
    console.error('   Add it and ensure the Geocoding API is enabled on the key.');
    process.exit(1);
  }

  console.log('Geocoding address:');
  console.log(`  ${address.street}, ${address.postal_code} ${address.city}, ${address.country}\n`);

  const result = await geocodeAddress(address);

  if (!result) {
    console.error('❌ Geocoding returned null (no result, or request failed — see logs above).');
    process.exit(1);
  }

  console.log('✅ Coordinates:');
  console.log(`   latitude:  ${result.latitude}`);
  console.log(`   longitude: ${result.longitude}`);
  console.log(`\n   Verify on a map: https://www.google.com/maps?q=${result.latitude},${result.longitude}`);
}

main();
