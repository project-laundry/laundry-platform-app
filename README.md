# NooraCare Laundry Platform

A peer-to-peer laundry platform connecting customers with local cleaners in Bergen and Oslo, Norway. Built with Next.js, TypeScript, Supabase, and Vipps payments.

## Features

- **Customer Dashboard**: Subscribe to laundry services, track orders, view history
- **Cleaner Dashboard**: (In development) Manage orders, set pricing, handle pickups
- **Admin Dashboard**: Assign orders, manage driver operations, oversee platform
- **Vipps Integration**: FLEXIBLE pricing model with per-order billing
- **Multi-Role System**: Customers, cleaners, and admins with role-based access
- **Subscription Management**: Weekly, biweekly, and monthly pickup frequencies

## Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Payments**: Vipps Recurring & ePayment APIs
- **UI**: Tailwind CSS v4
- **Runtime**: React 19.1.0

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Vipps merchant account (test or production)

### Environment Variables

Create a `.env.local` file with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Vipps
VIPPS_CLIENT_ID=your_client_id
VIPPS_CLIENT_SECRET=your_client_secret
VIPPS_SUBSCRIPTION_KEY=your_subscription_key
VIPPS_MERCHANT_SERIAL_NUMBER=your_msn
VIPPS_API_URL=https://apitest.vipps.no  # or https://api.vipps.no for production
VIPPS_WEBHOOK_SECRET=your_webhook_secret
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
# Apply migrations manually via Supabase dashboard or CLI

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Business logic and utilities
│   ├── database/     # Database operations
│   ├── payments/     # Vipps integration
│   └── services/     # Business services
├── types/            # TypeScript type definitions
└── middleware.ts     # Auth middleware
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Project overview and development guide
- **[ENTITIES.md](./ENTITIES.md)** - Database schema and entity definitions
- **[BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)** - Application workflows and business rules
- **[DASHBOARDS.md](./DASHBOARDS.md)** - UI specifications for different roles

## Payment Model

The platform uses **FLEXIBLE pricing**:

1. Customer subscribes → Vipps agreement created (no upfront charge)
2. Order generated with `total_cost_ore = NULL`
3. Cleaner picks up laundry, weighs it, calculates price
4. Cleaner creates Vipps charge for calculated amount
5. Customer pays for actual service provided

No fixed subscription fees - pay per order based on actual laundry weight and services.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Development Status

This project is in active development (MVP phase). Key implications:

- Database schema may change significantly
- Breaking changes are acceptable for architectural improvements
- Focus on clean, maintainable code over backward compatibility

## Contributing

This is a private project. For development questions, refer to the documentation files.

## License

Proprietary - All rights reserved
