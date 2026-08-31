import type { CleanerBusinessType, CleanerExperienceLevel } from './database';

export interface CleanerOnboardingData {
  // Business Information
  businessType: CleanerBusinessType;
  taxId: string;
  businessName?: string;
  businessAddress?: string;
  bankAccount: string;

  // Service Area
  baseStreet: string;
  basePostalCode: string;
  baseCity: string;
  baseCountry: string;
  baseSpecialInstructions?: string;

  // Equipment Information
  machineBrand: string;
  machineCapacityKg: string;
  machineYear: string;
  machineCondition: string;

  // Profile & Experience
  displayName: string;
  experienceLevel: CleanerExperienceLevel;

  // Confirmation (final step)
  termsAccepted: boolean;
  privacyAccepted: boolean;
  informationAccuracyConfirmed: boolean;
}
