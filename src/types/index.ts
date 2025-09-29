export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'cleaner' | 'admin';
  phone?: string;
  address?: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Customer extends User {
  role: 'customer';
  subscriptionPlan?: SubscriptionPlan;
  preferences?: LaundryPreferences;
}

export interface Cleaner extends User {
  role: 'cleaner';
  verified: boolean;
  rating: number;
  serviceArea: string[];
  availability: AvailabilitySchedule;
  serviceTier: 'basic' | 'premium' | 'expert';
}

export interface SubscriptionPlan {
  id: string;
  name: 'weekly' | 'biweekly' | 'single';
  price: number;
  currency: 'NOK';
  features: string[];
  maxOrders?: number;
  additionalServices?: AdditionalService[];
}

export interface AdditionalService {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'basic' | 'premium' | 'special';
}

export interface LaundryPreferences {
  detergentType?: 'eco' | 'standard' | 'hypoallergenic';
  specialInstructions?: string;
  delicateItems: boolean;
  preferredPickupTime?: 'morning' | 'afternoon' | 'evening';
}

export interface AvailabilitySchedule {
  [key: string]: {
    available: boolean;
    timeSlots: string[];
  };
}

export interface Order {
  id: string;
  customerId: string;
  cleanerId?: string;
  status: OrderStatus;
  items: LaundryItem[];
  pickupAddress: Address;
  deliveryAddress: Address;
  pickupTime?: Date;
  deliveryTime?: Date;
  specialInstructions?: string;
  totalPrice: number;
  rating?: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_progress'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface LaundryItem {
  type: LaundryItemType;
  quantity: number;
  specialCare?: boolean;
  notes?: string;
}

export type LaundryItemType =
  | 'shirts'
  | 'pants'
  | 'dresses'
  | 'suits'
  | 'bedding'
  | 'towels'
  | 'delicates'
  | 'outerwear'
  | 'other';