# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **NooraCare**, a peer-to-peer laundry platform that connects customers with local cleaners in Bergen and Oslo, Norway. The platform offers subscription-based pickup and delivery laundry services.

The application supports three user roles:

- **Customers**: Schedule laundry pickups via subscription plans
- **Cleaners**: Accept missions and provide laundry services
- **Admins**: Manage operations and platform oversight

## Development Philosophy

**This is an MVP.** Always prioritize the simplest solution that works:

- Choose simple, straightforward implementations over complex architectures
- Avoid over-engineering - build what's needed now, not what might be needed later
- Prefer existing patterns and libraries over custom solutions
- Keep code readable and maintainable rather than clever
- **Clean up unused code**: When removing a component, function, or import, always check if it's still used elsewhere. If not, delete the file/function entirely. Don't leave dead code in the codebase.

## Technology Stack

- **Framework**: Next.js 15.5.4 with TypeScript and App Router
- **UI**: Tailwind CSS v4
- **Runtime**: React 19.1.0
- **Path Aliases**: `@/*` maps to `./src/*`
- **Language**: Norwegian (locale `no`)

## Development Status

**This project is currently in the development phase.**

Key implications:
- Database changes can be made without complex migrations
- No need to backfill or preserve legacy data structures
- Breaking changes are acceptable if they improve the architecture
- Focus on clean, maintainable code over backward compatibility

## Backend & Database

- **Database**: Supabase (PostgreSQL)
- **Migrations**:
  - Always create migration files in `supabase/migrations/` instead of applying changes directly via Supabase MCP
  - Use format `YYYYMMDDHHMMSS_description.sql`
  - **IMPORTANT**: Never run migrations automatically - the user will apply them manually
  - Only create the migration file and inform the user
- **Schema Documentation**:
  - See `ENTITIES.md` for complete database schema, entity definitions, relationships, and data integrity rules
  - See `BUSINESS_LOGIC.md` for application workflows, operational rules, and business process definitions
  - See `DASHBOARDS.md` for role-based UI specifications (Admin, Cleaner, Customer dashboards)

## Development Commands

```bash
npm run dev        # Start development server (localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin dashboard
│   │   └── orders/         # Order management & cleaner assignment
│   ├── api/                # API routes
│   │   └── webhooks/
│   │       └── vipps/
│   │           ├── recurring/ # Vipps Recurring API webhooks (agreement activation, charge events)
│   │           └── epayment/  # Vipps ePayment API webhooks (per-order payments)
│   ├── auth/               # Authentication flow
│   │   ├── address/        # Address input step
│   │   ├── callback/       # Supabase auth callback
│   │   ├── login/          # Login page
│   │   ├── signup/         # Sign up page
│   │   └── success/        # Registration success
│   ├── bli-renser/         # Cleaner onboarding flow
│   │   ├── business/       # Business information
│   │   ├── equipment/      # Equipment details
│   │   ├── profile/        # Cleaner profile
│   │   ├── services/       # Service offerings
│   │   └── success/        # Onboarding success
│   ├── dashboard/          # User dashboards
│   │   └── cleaner/        # Cleaner dashboard & missions
│   ├── orders/             # Customer order flow
│   │   ├── [orderId]/      # Dynamic order details
│   │   ├── additional-services/  # Extra services selection
│   │   ├── confirm/        # Order confirmation
│   │   ├── instructions/   # Special instructions
│   │   ├── plans/          # Subscription plan selection
│   │   ├── schedule/       # Pickup scheduling
│   │   ├── services/       # Service type selection
│   │   ├── success/        # Order success
│   │   ├── upload-photo/   # Photo upload
│   │   └── actions.ts      # Server actions
│   └── profile/            # User profile pages
│       └── cleaner/        # Cleaner profile view
├── components/             # Reusable UI components
│   ├── auth/               # Auth components (empty)
│   ├── forms/              # Form components (empty)
│   ├── layout/             # Layout components (empty)
│   └── ui/                 # UI elements
│       ├── LogoutButton.tsx
│       └── NotificationCenter.tsx
├── hooks/                  # Custom React hooks (empty)
├── lib/                    # Core utilities and business logic
│   ├── auth/               # Auth utilities (empty - using Supabase directly)
│   ├── config/
│   │   └── pricing.ts      # Pricing constants and helpers (oreToNok, nokToOre)
│   ├── database/           # Database CRUD operations
│   │   ├── cleaners.ts     # Cleaner queries & matching
│   │   ├── customers.ts    # Customer queries
│   │   ├── orders.ts       # Order CRUD
│   │   ├── payment-agreements.ts  # Payment agreement CRUD (Vipps agreement lifecycle)
│   │   ├── payments.ts     # Payment operations (includes Vipps metadata management)
│   │   └── subscriptions.ts   # Subscription operations (recurring order management)
│   ├── payments/           # Payment processing integrations
│   │   └── vipps/          # Vipps Recurring API integration
│   │       ├── client.ts   # Vipps API client (auth, agreements, charges, capture)
│   │       ├── service.ts  # High-level Vipps service layer
│   │       └── config.ts   # Vipps configuration validation
│   ├── services/
│   │   └── order-generation.ts  # Subscription to orders logic
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   ├── server.ts       # Server Supabase client
│   │   └── index.ts        # Exports
│   ├── utils/
│   │   ├── date.ts         # Date/weekday utilities
│   │   └── order-number.ts # Order number generation
│   └── notifications.ts    # Notification templates and system
├── types/
│   ├── database.ts         # Complete entity types and enums
│   └── index.ts            # General type exports
└── middleware.ts           # Supabase session refresh
```

## Architecture Patterns

### Server Actions

Server actions handle mutations from the UI:

- `app/orders/actions.ts` - Subscription creation, Vipps agreement creation, customer queries
- `app/admin/orders/actions.ts` - Pending orders, cleaner assignment

**Note:** Vipps agreement creation uses server actions (not API routes) for consistency with the codebase pattern. API routes are only used where external services need to call in (webhooks, callbacks, cron).

### Database Access

All database operations use dedicated functions in `lib/database/`:

- Always use server-side Supabase client (`lib/supabase/server.ts`)
- Each entity has its own file with CRUD operations
- Type-safe with interfaces from `types/database.ts`

### Types

`src/types/database.ts` contains all entity types and enums:

- **Enums**: UserRole, OrderStatus, PaymentStatus, SubscriptionStatus, PaymentAgreementStatus, etc.
- **Entities**: User, Customer, Cleaner, PaymentAgreement, Order, Subscription, Payment, etc.

### Middleware

`src/middleware.ts` refreshes Supabase auth sessions on every request.

## Payment Processing

### Vipps Integration

The platform uses Vipps Recurring API for production payments with RESERVE_CAPTURE flow:

**Key Files:**
- `lib/database/payment-agreements.ts` - Payment agreement CRUD (Vipps agreement lifecycle, decoupled from subscriptions)
- `lib/payments/vipps/recurring-client.ts` - Vipps Recurring API client (agreements, charges)
- `lib/payments/vipps/epayment-client.ts` - Vipps ePayment API client (one-time payments)
- `lib/payments/vipps/base-client.ts` - Shared OAuth and HTTP utilities
- `lib/payments/vipps/webhook-auth.ts` - Shared webhook authentication (HMAC-SHA256)
- `lib/payments/vipps/service.ts` - High-level service layer orchestrating Vipps + database operations
- `lib/payments/vipps/config.ts` - Configuration validation and environment checks
- `app/orders/actions.ts` - Server actions including checkout flow (creates PaymentAgreement + optional Subscription)
- `app/api/webhooks/vipps/recurring/route.ts` - **Critical** webhook handler for Recurring API events - handles agreement activation, order generation, and charge events
- `app/api/webhooks/vipps/epayment/route.ts` - **Critical** webhook handler for ePayment API events (one-time payments)
- `lib/services/order-generation.ts` - Order generation service (calculates pickup dates based on subscription frequency)


**Environment Variables:**
- `VIPPS_CLIENT_ID` - Vipps API client ID
- `VIPPS_CLIENT_SECRET` - Vipps API client secret
- `VIPPS_SUBSCRIPTION_KEY` - Vipps API subscription key
- `VIPPS_MERCHANT_SERIAL_NUMBER` - Vipps merchant serial number (MSN)
- `VIPPS_API_URL` - Vipps API base URL (test: https://apitest.vipps.no, prod: https://api.vipps.no)
- `VIPPS_WEBHOOK_SECRET` - Shared webhook secret for HMAC-SHA256 signature verification (used by both webhooks)
- `VIPPS_WEBHOOK_SECRET_RECURRING` - Optional: Recurring API webhook-specific secret (overrides VIPPS_WEBHOOK_SECRET)
- `VIPPS_WEBHOOK_SECRET_EPAYMENT` - Optional: ePayment API webhook-specific secret (overrides VIPPS_WEBHOOK_SECRET)

**Webhook Configuration:**
The platform provides two separate webhook endpoints that can be registered in the Vipps dashboard:

1. **Recurring API Webhook**: `https://yourdomain.com/api/webhooks/vipps/recurring`
   - Subscribe to all `recurring.charge.*` events (reserved, captured, canceled, refunded, failed, creation-failed)
   - Subscribe to all `recurring.agreement.*` events (activated, rejected, stopped, expired)

2. **ePayment API Webhook**: `https://yourdomain.com/api/webhooks/vipps/epayment`
   - Subscribe to all `epayments.payment.*` events (created, authorized, captured, refunded, cancelled, aborted, expired, terminated)

Both webhooks use HMAC-SHA256 signature verification. You can use a shared secret (`VIPPS_WEBHOOK_SECRET`) or configure separate secrets per endpoint for additional security.

**Testing:**
- Manual payment option (`payment_provider = 'manual'`) preserved for development
- Vipps test environment available at https://apitest.vipps.no

**Key Database Schema:**
- **New Table:** `payment_agreements` - Decoupled Vipps agreement lifecycle from subscriptions
  - `provider_agreement_id` - Vipps agreement ID (unique)
  - `status` - pending/active/stopped/expired
  - `provider_metadata` - For one-time orders, stores `order_defaults`
- **Removed Tables:** `subscription_plans`, `bag_deliveries` (FLEXIBLE pricing eliminated need for plans)
- **Removed Fields:** `subscriptions.provider_agreement_id` (moved to `payment_agreements`), `subscriptions.next_billing_date`, `subscriptions.billing_cost_ore`, `subscriptions.recurring_weekday`, `subscriptions.expires_at`, `orders.plan_id`, `orders.extra_kg`, `orders.delicate_items_count`
- `subscriptions.payment_agreement_id` - FK to `payment_agreements` (replaces `provider_agreement_id`)
- `subscriptions.order_defaults` - Stores order generation defaults (JSONB):
  - `initial_address` - Pickup/delivery address
  - `special_instructions` - Pickup details
  - `location_city` - Service area (Bergen/Oslo) - used for cleaner matching
  - `default_needs_ironing` - Default ironing preference for orders
  - `default_cleaner_id` - Default cleaner assignment (orders can be reassigned)
  - `first_pickup_date` - ISO date for first order pickup (replaces recurring_weekday)
- `orders.payment_agreement_id` - FK to `payment_agreements` (for one-time orders without subscription)
- `orders.total_cost_ore` - **NULLABLE** (NULL until cleaner sets price)
- `orders.actual_weight_kg` - Actual weight after pickup
- `orders.pricing_notes` - Cleaner's pricing explanation
- `orders.price_calculated_at` - When cleaner calculated price
- `payments.provider_reference` - Merchant reference for webhook lookups (Recurring: chr_*, ePayment: custom ref)
- `payments.provider_metadata` - Stores Vipps charge/transaction details (JSONB)

See migrations:
- `supabase/migrations/20251218000000_redesign_order_flow_flexible_pricing.sql` - Major redesign to FLEXIBLE pricing
- `supabase/migrations/20251219133224_refactor_subscription_metadata.sql` - Moved fields into order_defaults JSONB
- `supabase/migrations/20251220120000_remove_recurring_weekday.sql` - Replaced with first_pickup_date
- `supabase/migrations/20251221135400_remove_bag_deliveries.sql` - Removed unused table
- `supabase/migrations/20260201120000_create_payment_agreements.sql` - Decoupled PaymentAgreement from Subscription

**Order Generation Architecture (Rolling Window):**
The platform uses a **rolling window** pattern that maintains 1 upcoming order at all times:

**Recurring subscriptions:**
1. PaymentAgreement + Subscription created → Vipps checkout
2. Agreement activated → PaymentAgreement + Subscription activated → First order generated with `total_cost_ore = NULL`
3. Cleaner sets price after pickup → Creates charge via `payment_agreements.provider_agreement_id`
4. Order completes → Next order auto-generated (pickup date based on frequency)
5. Pattern repeats indefinitely until subscription paused/cancelled

**One-time orders:**
1. PaymentAgreement created (no Subscription) → order_defaults stored in provider_metadata → Vipps checkout
2. Agreement activated → PaymentAgreement activated → Single order generated from metadata
3. Cleaner sets price → Creates charge → Order completes (no further orders generated)

This eliminates batch order generation - orders are created just-in-time as needed.