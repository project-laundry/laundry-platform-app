export interface TestCleaner {
  email: string;
  password: string;
  phone: string;
  full_name: string;
  address: {
    label: string;
    street: string;
    postal_code: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  cleaner_profile: {
    display_name: string;
    bio: string;
    verification_status: 'approved';
    business_type: 'individual' | 'business';
    tax_id: string;
    business_name: string | null;
    business_address: string | null;
    bank_account: string;
    experience_level: 'beginner' | 'experienced' | 'expert' | 'professional';
    languages: string[];
    specializations: string[];
    weekly_schedule: {
      mon: boolean;
      tue: boolean;
      wed: boolean;
      thu: boolean;
      fri: boolean;
      sat: boolean;
      sun: boolean;
    };
  };
}

// Random data generators
const FIRST_NAMES = [
  'Lars', 'Kari', 'Ole', 'Anna', 'Erik', 'Ingrid', 'Per', 'Marit',
  'Jon', 'Liv', 'Arne', 'Solveig', 'Bjørn', 'Astrid', 'Kjell', 'Grete',
  'Odd', 'Randi', 'Tor', 'Berit', 'Svein', 'Inger', 'Gunnar', 'Turid'
];

const LAST_NAMES = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen',
  'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen', 'Johnsen', 'Pettersen',
  'Eriksen', 'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen'
];

const BUSINESS_NAMES = [
  'Vaskeri', 'Rengjøring', 'Klesvask', 'Vask & Stell', 'Rent & Fint',
  'Vasketjenester', 'Tøyvask', 'Fresh Laundry', 'Clean & Care'
];

const BUSINESS_SUFFIXES = ['AS', 'DA'];

const BERGEN_STREETS = [
  { street: 'Nedre Korskirkeallmenningen', numbers: [1, 20], postal: '5017', lat: 60.3951, lon: 5.3235 },
  { street: 'Bryggen', numbers: [1, 30], postal: '5003', lat: 60.3975, lon: 5.3241 },
  { street: 'Åsane Senter', numbers: [1, 25], postal: '5116', lat: 60.4643, lon: 5.3245 },
  { street: 'Fanaveien', numbers: [1, 50], postal: '5244', lat: 60.2897, lon: 5.2956 },
  { street: 'Laksevåg Torg', numbers: [1, 15], postal: '5160', lat: 60.3756, lon: 5.2834 },
  { street: 'Sandviken', numbers: [1, 40], postal: '5035', lat: 60.4041, lon: 5.3147 },
  { street: 'Nygårdsgaten', numbers: [1, 35], postal: '5015', lat: 60.3899, lon: 5.3243 },
  { street: 'Fyllingsveien', numbers: [1, 60], postal: '5147', lat: 60.3589, lon: 5.3432 },
];

const OSLO_STREETS = [
  { street: 'Karl Johans gate', numbers: [1, 50], postal: '0154', lat: 59.9139, lon: 10.7522 },
  { street: 'Storgata', numbers: [1, 60], postal: '0182', lat: 59.9127, lon: 10.7461 },
  { street: 'Grønland', numbers: [1, 40], postal: '0188', lat: 59.9103, lon: 10.7642 },
  { street: 'Bogstadveien', numbers: [1, 70], postal: '0366', lat: 59.9263, lon: 10.7185 },
  { street: 'Thorvald Meyers gate', numbers: [1, 80], postal: '0555', lat: 59.9223, lon: 10.7583 },
  { street: 'Sofienberggata', numbers: [1, 45], postal: '0558', lat: 59.9205, lon: 10.7621 },
];

const SPECIALIZATIONS = [
  'delicate', 'formal', 'wool', 'silk', 'down', 'sportswear', 'leather', 'outerwear'
];

const EXPERIENCE_LEVELS: Array<'beginner' | 'experienced' | 'expert' | 'professional'> = [
  'beginner', 'experienced', 'expert', 'professional'
];

const BIO_TEMPLATES = [
  'Erfaren vasker med fokus på kvalitet og god service.',
  'Nøye og pålitelig. Tar godt vare på klærne dine.',
  'Spesialiserer meg på finvask og delikate stoffer.',
  'Profesjonell vaskehjelp med mange års erfaring.',
  'Miljøvennlig vask med fokus på bærekraft.',
  'Rask og effektiv vasketjeneste i Bergen.',
  'Personlig service og god kommunikasjon.',
  'Ekspert på alle typer tekstiler og vasketeknikker.'
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

function generateTaxId(): string {
  return String(randomNumber(10000000000, 99999999999));
}

function generateBankAccount(): string {
  return String(randomNumber(10000000000, 99999999999));
}

function generateWeeklySchedule() {
  const randomDays = () => Math.random() > 0.3;
  return {
    mon: randomDays(),
    tue: randomDays(),
    wed: randomDays(),
    thu: randomDays(),
    fri: randomDays(),
    sat: Math.random() > 0.5,
    sun: Math.random() > 0.7,
  };
}

export function generateRandomCleaner(
  city: 'Bergen' | 'Oslo' = 'Bergen',
  type: 'individual' | 'business' | 'mixed' = 'mixed'
): TestCleaner {
  const isIndividual = type === 'mixed'
    ? Math.random() > 0.3
    : type === 'individual';
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const fullName = isIndividual
    ? `${firstName} ${lastName}`
    : `${randomElement(BUSINESS_NAMES)} ${randomElement(BUSINESS_SUFFIXES)}`;

  const emailName = isIndividual
    ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
    : fullName.toLowerCase().replace(/\s+/g, '').replace(/[æøå]/g, (m) => ({ æ: 'ae', ø: 'o', å: 'a' }[m] || m));

  const timestamp = Date.now();
  const random = randomNumber(1000, 9999);
  const email = `${emailName}.${timestamp}.${random}@test.no`;

  const streets = city === 'Bergen' ? BERGEN_STREETS : OSLO_STREETS;
  const streetData = randomElement(streets);
  const streetNumber = randomNumber(streetData.numbers[0], streetData.numbers[1]);
  const fullAddress = `${streetData.street} ${streetNumber}`;

  const numSpecializations = randomNumber(2, 4);
  const selectedSpecializations: string[] = [];
  while (selectedSpecializations.length < numSpecializations) {
    const spec = randomElement(SPECIALIZATIONS);
    if (!selectedSpecializations.includes(spec)) {
      selectedSpecializations.push(spec);
    }
  }

  const experienceLevel = randomElement(EXPERIENCE_LEVELS);
  const languages = ['no'];
  if (Math.random() > 0.5) languages.push('en');
  if (Math.random() > 0.8) languages.push(randomElement(['pl', 'de', 'es', 'fr']));

  return {
    email,
    password: 'password123',
    phone: generatePhoneNumber(),
    full_name: fullName,
    address: {
      label: isIndividual ? 'Hjem' : 'Kontor',
      street: fullAddress,
      postal_code: streetData.postal,
      city,
      country: 'Norway',
      latitude: streetData.lat + (Math.random() - 0.5) * 0.01,
      longitude: streetData.lon + (Math.random() - 0.5) * 0.01,
    },
    cleaner_profile: {
      display_name: fullName,
      bio: randomElement(BIO_TEMPLATES),
      verification_status: 'approved',
      business_type: isIndividual ? 'individual' : 'business',
      tax_id: generateTaxId(),
      business_name: isIndividual ? null : fullName,
      business_address: isIndividual ? null : fullAddress + `, ${streetData.postal} ${city}`,
      bank_account: generateBankAccount(),
      experience_level: experienceLevel,
      languages,
      specializations: selectedSpecializations,
      weekly_schedule: generateWeeklySchedule(),
    },
  };
}

