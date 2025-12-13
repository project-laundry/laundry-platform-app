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
│   │   ├── cron/
│   │   │   └── billing/    # Recurring billing scheduler (Vercel Cron)
│   │   ├── vipps/
│   │   │   └── agreements/
│   │   │       └── callback/ # Vipps agreement callback (external redirect)
│   │   └── webhooks/
│   │       ├── payment/    # Manual payment webhook (testing)
│   │       └── vipps/
│   │           ├── recurring/ # Vipps Recurring API webhooks (subscriptions)
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
- `app/api/webhooks/vipps/recurring/route.ts` - **Critical** webhook handler for Recurring API events (subscriptions)
- `app/api/webhooks/vipps/epayment/route.ts` - **Critical** webhook handler for ePayment API events (one-time payments)
- `app/api/cron/billing/route.ts` - Recurring billing scheduler (Vercel Cron, API route)

**Payment Flow:**
1. RESERVE_CAPTURE (two-step): pending → authorized (funds reserved) → captured (funds taken)
2. Webhook-driven activation: Subscriptions activate when payment captured
3. Automatic capture: System immediately captures reserved funds (no manual intervention)
4. Recurring billing: Cron job runs daily to create charges for subscriptions due for billing

**Environment Variables:**
- `VIPPS_CLIENT_ID` - Vipps API client ID
- `VIPPS_CLIENT_SECRET` - Vipps API client secret
- `VIPPS_SUBSCRIPTION_KEY` - Vipps API subscription key
- `VIPPS_MERCHANT_SERIAL_NUMBER` - Vipps merchant serial number (MSN)
- `VIPPS_API_URL` - Vipps API base URL (test: https://apitest.vipps.no, prod: https://api.vipps.no)
- `VIPPS_WEBHOOK_SECRET` - Shared webhook secret for HMAC-SHA256 signature verification (used by both webhooks)
- `VIPPS_WEBHOOK_SECRET_RECURRING` - Optional: Recurring API webhook-specific secret (overrides VIPPS_WEBHOOK_SECRET)
- `VIPPS_WEBHOOK_SECRET_EPAYMENT` - Optional: ePayment API webhook-specific secret (overrides VIPPS_WEBHOOK_SECRET)
- `CRON_SECRET` - Optional secret for billing cron authentication

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
- `subscriptions.provider_agreement_metadata` - Stores Vipps agreement details (JSONB)
- `payments.status` - Added 'authorized' status for RESERVE_CAPTURE flow
- `payments.provider_metadata` - Stores Vipps charge/transaction details (JSONB)

See migration: `supabase/migrations/20250210000000_add_vipps_support.sql`