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
- Prefer Server Components over Client Components - only use "use client" when necessary for hooks, event handlers, or browser APIs
- When modifying pages, always check for unnecessary "use client" directives and refactor to Server Components where possible (e.g., replace onClick navigation with Link components)

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

When the system moves to production, this section should be updated to reflect:
- Data migration strategies
- Backward compatibility requirements
- Deprecation policies

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
│   │   ├── auth/vipps/     # Vipps OAuth callback (legacy)
│   │   ├── vipps/
│   │   │   └── agreements/
│   │   │       └── callback/ # Vipps agreement callback (external redirect)
│   │   └── webhooks/
│   │       ├── payment/    # Manual payment webhook (testing)
│   │       └── vipps/
│   │           ├── recurring/ # Vipps Recurring API webhooks (subscriptions, order generation)
│   │           └── epayment/  # Vipps ePayment API webhooks (one-time payments)
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
│   │   ├── bag-deliveries.ts  # Bag delivery operations
│   │   ├── cleaners.ts     # Cleaner queries & matching
│   │   ├── customers.ts    # Customer queries
│   │   ├── orders.ts       # Order CRUD
│   │   ├── payments.ts     # Payment operations (includes Vipps metadata management)
│   │   └── subscriptions.ts   # Subscription operations (includes Vipps agreement management)
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

- **Enums**: UserRole, OrderStatus, PaymentStatus, SubscriptionStatus, etc.
- **Entities**: User, Customer, Cleaner, Order, Subscription, Payment, etc.

### Middleware

`src/middleware.ts` refreshes Supabase auth sessions on every request.

## Payment Processing

### Vipps Integration

The platform uses Vipps Recurring API for production payments with RESERVE_CAPTURE flow:

**Key Files:**
- `lib/payments/vipps/recurring-client.ts` - Vipps Recurring API client (agreements, charges)
- `lib/payments/vipps/epayment-client.ts` - Vipps ePayment API client (one-time payments)
- `lib/payments/vipps/base-client.ts` - Shared OAuth and HTTP utilities
- `lib/payments/vipps/webhook-auth.ts` - Shared webhook authentication (HMAC-SHA256)
- `lib/payments/vipps/service.ts` - High-level service layer orchestrating Vipps + database operations
- `lib/payments/vipps/config.ts` - Configuration validation and environment checks
- `app/orders/actions.ts` - Server actions including `createVippsAgreementAction()` for agreement creation
- `app/api/vipps/agreements/callback/route.ts` - Post-approval redirect handler (API route)
- `app/api/webhooks/vipps/recurring/route.ts` - **Critical** webhook handler for Recurring API events (subscriptions) - handles order generation and self-perpetuating charge creation
- `app/api/webhooks/vipps/epayment/route.ts` - **Critical** webhook handler for ePayment API events (one-time payments)
- `lib/services/order-generation.ts` - Order generation service (calculates pickup dates based on subscription frequency)

**Payment Flow:**
1. RESERVE_CAPTURE (two-step): pending → authorized (funds reserved) → captured (funds taken)
2. Webhook-driven activation: Subscriptions activate when agreement approved (status → 'active')
3. Automatic capture: System immediately captures reserved funds (no manual intervention)
4. **Self-perpetuating billing**: When charge captured → Generate orders for current period → Create next charge with due_date = next_billing_date → Vipps processes automatically on that date
5. Order generation: Based on plan frequency (weekly → 4 orders/month, biweekly → 2 orders/month, monthly → 1 order/month)

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
- Mock webhook at `/api/webhooks/payment` for manual testing

**Database Changes:**
- `subscriptions.provider_agreement_id` - Stores Vipps agreement ID
- `subscriptions.order_defaults` - Stores order generation defaults (JSONB):
  - `initial_address` - Pickup/delivery address
  - `special_instructions` - Pickup details
  - `location_city` - Service area (Bergen/Oslo) - used for cleaner matching
  - `default_needs_ironing` - Default ironing preference for orders
  - `default_cleaner_id` - Default cleaner assignment (orders can be reassigned)
- `subscriptions.next_billing_date` - Set when charge captured, drives self-perpetuating billing
- `payments.status` - Added 'authorized' status for RESERVE_CAPTURE flow
- `payments.provider_metadata` - Stores Vipps charge/transaction details (JSONB)

See migrations:
- `supabase/migrations/20250210000000_add_vipps_support.sql`
- `supabase/migrations/20251219133224_refactor_subscription_metadata.sql` - Renamed provider_agreement_metadata to order_defaults, moved location_city, default_needs_ironing, and assigned_cleaner_id into JSONB

**Recurring Billing Architecture:**
The platform uses a **self-perpetuating** pattern where each charge capture automatically schedules the next charge:
1. Charge captured → Orders generated for current period
2. `next_billing_date` set to current date + 1 month
3. Next charge created with Vipps with `due_date = next_billing_date`
4. Vipps automatically processes charge on that date → Cycle repeats

This eliminates the need for polling or cron jobs - Vipps handles the scheduling.