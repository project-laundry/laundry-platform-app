/**
 * Validates Norwegian phone number format
 * Accepts: +47 followed by 8 digits, or just 8 digits
 */
export function validateNorwegianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');

  // Accept +47 followed by 8 digits
  if (cleaned.startsWith('+47')) {
    return /^\+47\d{8}$/.test(cleaned);
  }

  // Accept 8 digits
  return /^\d{8}$/.test(cleaned);
}

/**
 * Validates Norwegian bank account number
 * Must be exactly 11 digits
 */
export function validateBankAccount(account: string): boolean {
  const cleaned = account.replace(/\s/g, '');
  return /^\d{11}$/.test(cleaned);
}

/**
 * Validates tax ID based on business type
 * Individual: 11 digits (fødselsnummer)
 * Business: 9 digits (organisasjonsnummer)
 */
export function validateTaxId(id: string, type: 'individual' | 'business'): boolean {
  const cleaned = id.replace(/\s/g, '');

  if (type === 'individual') {
    return /^\d{11}$/.test(cleaned);
  }

  if (type === 'business') {
    return /^\d{9}$/.test(cleaned);
  }

  return false;
}

/**
 * Validates Norwegian postal code
 * Must be exactly 4 digits
 */
export function validatePostalCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/**
 * Validates machine year
 * Must be 4 digits and in reasonable range (1900-2024)
 */
export function validateYear(year: string): boolean {
  if (!/^\d{4}$/.test(year)) {
    return false;
  }

  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();

  return yearNum >= 1900 && yearNum <= currentYear;
}
