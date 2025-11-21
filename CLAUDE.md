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
- **Migrations**: Always create migration files in `supabase/migrations/` instead of applying changes directly via Supabase MCP. Use format `YYYYMMDDHHMMSS_description.sql`
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
│   │   ├── auth/vipps/     # Vipps OAuth callback
│   │   └── webhooks/payment/  # Payment webhooks
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
│   │   ├── payments.ts     # Payment operations
│   │   └── subscriptions.ts   # Subscription operations
│   ├── payments/           # Payment processing (empty - integration ready)
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

- `app/orders/actions.ts` - Subscription creation, customer queries
- `app/admin/orders/actions.ts` - Pending orders, cleaner assignment

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