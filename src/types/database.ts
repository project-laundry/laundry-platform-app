// NooraCare Database Types
// Generated from ENTITIES.md specification

// =============================================================================
// ENUMS
// =============================================================================

export type UserRole = 'customer' | 'cleaner' | 'driver' | 'admin';

export type CleanerVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type CleanerBusinessType = 'individual' | 'business';

export type CleanerExperienceLevel = 'beginner' | 'some' | 'experienced' | 'expert' | 'professional';

export type PaymentAgreementStatus = 'pending' | 'active' | 'stopped' | 'expired';

export type SubscriptionStatus = 'pending_payment' | 'active' | 'paused' | 'cancelled' | 'expired';

export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'on_demand';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

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

export type PromoDiscountType = 'percentage' | 'fixed';

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
  // Geocoded base coordinates (null until geocoded)
  latitude: number | null;
  longitude: number | null;
  experience_level: CleanerExperienceLevel;
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

export interface Driver {
  id: string;
  user_id: string;
  // The one city this driver serves ('Bergen' or 'Oslo'); assigned at creation
  city: string;
  // Stored route start point (null → the dashboard falls back to the city centre)
  start_latitude: number | null;
  start_longitude: number | null;
  start_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAgreement {
  id: string;
  customer_id: string;
  provider: string;
  provider_agreement_id: string;
  status: PaymentAgreementStatus;
  provider_metadata: Record<string, unknown> | null;
  created_at: string;
  activated_at: string | null;
  stopped_at: string | null;
  updated_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  // Subscription settings
  frequency: SubscriptionFrequency;
  // Status and metadata
  status: SubscriptionStatus;
  payment_agreement_id: string | null;
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
    // Geocoded coordinates, propagated onto each generated order (null if geocoding failed)
    latitude?: number | null;
    longitude?: number | null;
  };
  special_instructions?: string;
  location_city: 'Bergen' | 'Oslo';
  default_needs_ironing: boolean;
  default_cleaner_id: string | null;
  first_pickup_date: string; // ISO date string (YYYY-MM-DD) - replaces recurring_weekday
  // Customer's checkout selection, stamped onto every generated order.
  // Optional: subscriptions created before the estimate flow lack it.
  customer_estimate?: CustomerEstimate | null;
  [key: string]: unknown; // Allow additional fields from Vipps metadata
}

/**
 * Customer's self-reported selection from checkout plus the estimate total they
 * were shown (stored in orders.customer_estimate and order_defaults JSONB).
 * Informational — the binding price is set by the cleaner after pickup.
 */
export interface CustomerEstimate {
  bags: number;
  bedding_sets: number;
  iron_everyday_items: number;
  iron_formal_items: number;
  iron_bedding: boolean;
  estimated_total_ore: number;
}

/**
 * Ironing quantities per group (stored in orders.ironing_details JSONB).
 * Bedding is counted in sets.
 */
export interface OrderIroningDetails {
  everyday: number;
  shirts_dresses: number;
  bedding: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  subscription_id: string | null;
  payment_agreement_id: string | null;
  cleaner_id: string | null;
  status: OrderStatus;
  // Address (single address - pickup = delivery)
  street: string;
  postal_code: string;
  city: string;
  country: string;
  special_instructions_address: string | null;
  // Geocoded pickup coordinates (null until geocoded)
  latitude: number | null;
  longitude: number | null;
  // Scheduling
  scheduled_date: string;
  delivery_date: string;
  // Pickup details
  special_instructions: string | null;
  // Service preferences
  needs_ironing: boolean;
  // Customer's checkout selection + estimate (null for pre-estimate orders)
  customer_estimate: CustomerEstimate | null;
  // Laundry details (cleaner input)
  wash_loads: number;
  ironing_details: OrderIroningDetails | null;
  // Pricing (calculated by cleaner)
  actual_weight_kg: number | null;
  pricing_notes: string | null;
  price_calculated_at: string | null;
  total_cost_ore: number | null;
  // Promo code applied at checkout (first order only); null if none
  promo: OrderPromo | null;
  // Other
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

export interface PromoCode {
  id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number; // percentage 1-100, or amount in øre for fixed
  max_discount_ore: number | null; // optional cap for percentage codes
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null; // optional global cap; null = unlimited
  created_at: string;
  updated_at: string;
}

export interface PromoCodeRedemption {
  id: string;
  promo_code_id: string;
  customer_id: string;
  payment_agreement_id: string | null;
  order_id: string | null;
  redeemed_at: string;
}

/**
 * Locked promo snapshot stored in orders.promo and payment_agreements.provider_metadata.promo.
 * Discount terms are captured at checkout so the deal survives even if the code is later
 * deactivated or changed. discount_ore is filled in when the cleaner prices the order.
 */
export interface OrderPromo {
  promo_code_id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  max_discount_ore: number | null;
  discount_ore?: number; // actual discount applied (set at pricing time)
}

// =============================================================================
// HELPER TYPES FOR RELATIONSHIPS
// =============================================================================

export interface UserWithProfile extends User {
  customer?: Customer;
  cleaner?: Cleaner;
  admin?: Admin;
  driver?: Driver;
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
  payments?: Payment[];
  assigned_cleaner_id?: string | null;
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
 * Stored in payment_agreements.provider_metadata
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
  drivers: Driver;
  payment_agreements: PaymentAgreement;
  subscriptions: Subscription;
  orders: Order;
  payments: Payment;
  promo_codes: PromoCode;
  promo_code_redemptions: PromoCodeRedemption;
};

export type TableName = keyof Tables;
