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

## Technology Stack

- **Framework**: Next.js 15.5.4 with TypeScript and App Router
- **UI**: Tailwind CSS v4
- **Runtime**: React 19.1.0
- **Path Aliases**: `@/*` maps to `./src/*`
- **Language**: Norwegian (locale `no`)

## Backend & Database

- **Database**: Supabase (PostgreSQL)
- **Project**: laundry-platform
- **Project ID**: uknariyagkmhdjqrllhf
- **Region**: eu-north-1 (Europe/Stockholm)
- **API URL**: https://uknariyagkmhdjqrllhf.supabase.co
- **Schema Documentation**: See `ENTITIES.md` for complete database schema, entity definitions, relationships, and data integrity rules

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://uknariyagkmhdjqrllhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrbmFyaXlhZ2ttaGRqcXJsbGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTc5OTEsImV4cCI6MjA3ODg3Mzk5MX0.wjxGV9tj3gtujZsf512SoNZnqbSy8oFSEqNOvpZyQbo
```

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
├── app/                # Next.js App Router pages
│   ├── auth/           # Authentication flow
│   │   ├── address/    # Address input step
│   │   ├── login/      # Login page
│   │   ├── signup/     # Sign up page
│   │   └── success/    # Registration success
│   ├── bli-renser/     # Cleaner onboarding flow
│   │   ├── business/   # Business information
│   │   ├── equipment/  # Equipment details
│   │   ├── profile/    # Cleaner profile
│   │   ├── services/   # Service offerings
│   │   └── success/    # Onboarding success
│   ├── dashboard/      # User dashboards
│   │   └── cleaner/    # Cleaner dashboard
│   ├── orders/         # Order management flow
│   │   ├── [orderId]/  # Dynamic order details
│   │   ├── additional-services/  # Extra services selection
│   │   ├── confirm/    # Order confirmation
│   │   ├── instructions/  # Special instructions
│   │   ├── plans/      # Subscription plan selection
│   │   ├── schedule/   # Pickup scheduling
│   │   ├── services/   # Service type selection
│   │   └── success/    # Order success
│   └── profile/        # User profile pages
│       └── cleaner/    # Cleaner profile view
├── components/         # Reusable UI components
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   └── ui/             # Basic UI elements
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── auth/           # Authentication logic
│   ├── database/       # Database connections/queries
│   ├── payments/       # Payment processing
│   └── utils/          # General utilities
└── types/              # TypeScript type definitions
```
- when working with the `ENTITIES.md` file, don't implement schema migration yet as it's not implemented yet