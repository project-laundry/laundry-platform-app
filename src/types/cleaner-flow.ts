import type {
  CleanerBusinessType,
  CleanerExperienceLevel,
  CleanerMachineCondition,
} from './database';

export interface CleanerOnboardingData {
  // Step 1: business + payout
  businessType: CleanerBusinessType;
  taxId: string; // digits only (11 for individual, 9 for business)
  businessName?: string;
  businessAddress?: string;
  bankAccount: string; // digits only, 11

  // Step 2: base address (where the cleaner washes; drivers deliver/collect here)
  baseStreet: string;
  basePostalCode: string;
  baseCity: string;
  baseCountry: string;
  baseSpecialInstructions?: string;

  // Step 3: washing machine (kept as form strings; the server action converts)
  machineBrand: string;
  machineCapacityKg: string;
  machineYear: string;
  machineCondition: CleanerMachineCondition;

  // Step 4: profile
  displayName: string;
  experienceLevel: CleanerExperienceLevel;

  // Step 5: confirmation
  termsAccepted: boolean;
  privacyAccepted: boolean;
  informationAccuracyConfirmed: boolean;
}
