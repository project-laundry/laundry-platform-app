export interface OrderData {
  // Location
  location: 'Bergen' | 'Oslo';

  // Frequency
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | null;

  // Date
  firstPickupDate: string; // ISO date

  // Ironing preference (default for all orders)
  needsIroning: boolean;

  // Address (kept separate for clarity)
  address: {
    street: string;
    city: string;
    postalCode: string;
    specialInstructions: string;
  };

  // Instructions
  specialInstructions?: string;
}
