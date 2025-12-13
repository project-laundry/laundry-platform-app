import type { PickupMethod } from './database';

export type Plan = 'single' | 'weekly' | 'biweekly';

export interface OrderData {
  // Plan selection
  plan: Plan;
  hasBag: boolean;

  // Schedule
  pickupDate?: string;
  pickupTime: string;

  // Address
  address: {
    street: string;
    city: string;
    postalCode: string;
    specialInstructions: string;
  };

  // Pickup details
  pickupMethod: PickupMethod;
  otherLocation: string;

  // Instructions
  specialInstructions: string;

  // Additional services
  additionalKg: number;
  delicateItems: number;
  needsIroning: boolean;
}
