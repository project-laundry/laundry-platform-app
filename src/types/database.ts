// NooraCare Database Types
// Generated from ENTITIES.md specification

// =============================================================================
// ENUMS
// =============================================================================

export type UserRole = 'customer' | 'cleaner' | 'admin';

export type CleanerVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type CleanerBusinessType = 'individual' | 'business';

export type CleanerExperienceLevel = 'beginner' | 'some' | 'experienced' | 'expert' | 'professional';

export type CleanerSpecialization =
  | 'wool'
  | 'silk'
  | 'down'
  | 'sportswear'
  | 'leather'
  | 'delicate'
  | 'formal'
  | 'outerwear';

export type SubscriptionStatus = 'pending_payment' | 'active' | 'paused' | 'cancelled' | 'expired';

export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'on_demand';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type PickupMethod = 'home' | 'entrance' | 'other';

export type BagDeliveryStatus = 'pending' | 'scheduled' | 'en_route' | 'delivered' | 'completed' | 'cancelled';

export type OrderStatus =
  | 'pending_assignment'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_cleaning'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type PaymentType = 'recurring' | 'one_time' | 'refund';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'cancelled';

export type PaymentProvider = 'vipps' | 'stripe' | 'manual';

// =============================================================================
// ENTITY TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
}

export interface Customer {
  id: string;
  user_id: string;
  laundry_bags_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WeeklySchedule {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

export interface Cleaner {
  id: string;
  user_id: string;
  display_name: string;
  profile_image_url: string | null;
  bio: string | null;
  verification_status: CleanerVerificationStatus;
  business_type: CleanerBusinessType;
  tax_id: string;
  business_name: string | null;
  business_address: string | null;
  bank_account: string;
  base_street: string;
  base_postal_code: string;
  base_city: string;
  base_country: string;
  base_special_instructions: string | null;
  experience_level: CleanerExperienceLevel;
  languages: string[];
  specializations: CleanerSpecialization[] | null;
  weekly_schedule: WeeklySchedule;
  is_accepting_orders: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  suspended_at: string | null;
  deleted_at: string | null;
}

export interface Admin {
  id: string;
  user_id: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface BagDelivery {
  id: string;
  delivery_number: string;
  customer_id: string;
  delivery_street: string;
  delivery_postal_code: string;
  delivery_city: string;
  delivery_country: string;
  delivery_special_instructions: string | null;
  status: BagDeliveryStatus;
  bag_quantity: number;
  scheduled_date: string;
  special_instructions: string | null;
  delivered_at: string | null;
  placement_photo_url: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  // Subscription settings
  frequency: SubscriptionFrequency;
  // Status and metadata
  status: SubscriptionStatus;
  provider_agreement_id: string | null;
  order_defaults: SubscriptionOrderDefaults | null;
  started_at: string | null;
  paused_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Order generation defaults stored in subscriptions.order_defaults
 * Contains all default values for creating orders from a subscription
 */
export interface SubscriptionOrderDefaults {
  initial_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
    special_instructions?: string;
  };
  pickup_method: PickupMethod;
  pickup_location_description?: string;
  special_instructions?: string;
  location_city: 'Bergen' | 'Oslo';
  default_needs_ironing: boolean;
  default_cleaner_id: string | null;
  first_pickup_date: string; // ISO date string (YYYY-MM-DD) - replaces recurring_weekday
  [key: string]: unknown; // Allow additional fields from Vipps metadata
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  subscription_id: string | null;
  cleaner_id: string | null;
  status: OrderStatus;
  // Address (single address - pickup = delivery)
  street: string;
  postal_code: string;
  city: string;
  country: string;
  special_instructions_address: string | null;
  // Scheduling
  scheduled_date: string;
  delivery_date: string;
  // Pickup details
  pickup_method: PickupMethod;
  pickup_location_description: string | null;
  special_instructions: string | null;
  // Service preferences
  needs_ironing: boolean;
  // Pricing (calculated by cleaner)
  actual_weight_kg: number | null;
  pricing_notes: string | null;
  price_calculated_at: string | null;
  total_cost_ore: number | null;
  // Other
  prerequisite_bag_delivery_id: string | null;
  declined_by_cleaner_ids: string[] | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  in_cleaning_at: string | null;
  ready_for_delivery_at: string | null;
  out_for_delivery_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  mission_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  order_id: string | null;
  subscription_id: string | null;
  payment_type: PaymentType;
  amount_ore: number;
  status: PaymentStatus;
  payment_provider: PaymentProvider;
  provider_reference: string | null;
  provider_metadata: Record<string, unknown> | null;
  authorized_at: string | null;
  captured_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  refunded_at: string | null;
  refund_amount_ore: number | null;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// HELPER TYPES FOR RELATIONSHIPS
// =============================================================================

export interface UserWithProfile extends User {
  customer?: Customer;
  cleaner?: Cleaner;
  admin?: Admin;
}

export interface CustomerWithRelations extends Customer {
  user?: User;
  subscriptions?: Subscription[];
  orders?: Order[];
}

export interface CleanerWithRelations extends Cleaner {
  user?: User;
  orders?: Order[];
}

export interface OrderWithRelations extends Order {
  customer?: Customer;
  cleaner?: Cleaner;
  subscription?: Subscription;
  prerequisite_bag_delivery?: BagDelivery;
  payments?: Payment[];
}

export interface SubscriptionWithRelations extends Subscription {
  customer?: Customer;
  assigned_cleaner?: Cleaner;
  orders?: Order[];
  payments?: Payment[];
}

// =============================================================================
// VIPPS PAYMENT PROVIDER METADATA TYPES
// =============================================================================

/**
 * Vipps agreement status types
 */
export type VippsAgreementStatus = 'PENDING' | 'ACTIVE' | 'STOPPED' | 'EXPIRED';

/**
 * Vipps charge status types (RESERVE_CAPTURE flow)
 */
export type VippsChargeStatus = 'PENDING' | 'DUE' | 'RESERVED' | 'CHARGED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_CAPTURED';

/**
 * Vipps agreement metadata structure
 * Stored in subscriptions.order_defaults (merged with order generation defaults)
 */
export interface VippsAgreementMetadata {
  vipps_agreement_id: string;
  vipps_initial_charge_id?: string;
  vipps_checkout_url?: string;
  agreement_status?: VippsAgreementStatus;
  created_at?: string;
  [key: string]: unknown;
}

/**
 * Vipps payment (charge) metadata structure
 * Stored in payments.provider_metadata
 */
export interface VippsPaymentMetadata {
  vipps_agreement_id: string;
  vipps_charge_id: string;
  vipps_transaction_id?: string;
  vipps_status?: VippsChargeStatus;
  retry_count?: number;
  last_retry_at?: string;
  reserved_at?: string;
  captured_at?: string;
  [key: string]: unknown;
}

// =============================================================================
// DATABASE ROW TYPES (for Supabase client)
// =============================================================================

export type Tables = {
  users: User;
  customers: Customer;
  cleaners: Cleaner;
  admins: Admin;
  bag_deliveries: BagDelivery;
  subscriptions: Subscription;
  orders: Order;
  payments: Payment;
};

export type TableName = keyof Tables;
