# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **RenVask**, a peer-to-peer laundry platform that connects customers with local cleaners in Bergen and Oslo, Norway. The platform offers subscription-based pickup and delivery laundry services, with three tiers (Starter 500 NOK, Family 1000 NOK, Premium 2000 NOK monthly).

The application supports three user roles:
- **Customers**: Schedule laundry pickups via subscription plans
- **Cleaners**: Accept missions and provide laundry services
- **Admins**: Manage operations and platform oversight

## Technology Stack

- **Framework**: Next.js 15.5.4 with TypeScript and App Router
- **UI**: Tailwind CSS v4
- **Runtime**: React 19.1.0
- **Path Aliases**: `@/*` maps to `./src/*`
- **Language**: Norwegian (locale `no`)

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
├── app/           # Next.js App Router pages
│   ├── auth/      # Authentication pages
│   ├── dashboard/ # User dashboards
│   ├── orders/    # Order management
│   └── profile/   # User profile pages
├── components/    # Reusable UI components
│   ├── forms/     # Form components
│   ├── layout/    # Layout components
│   └── ui/        # Basic UI elements
├── hooks/         # Custom React hooks
├── lib/           # Utility libraries
│   ├── auth/      # Authentication logic
│   ├── database/  # Database connections/queries
│   ├── payments/  # Payment processing
│   └── utils/     # General utilities
└── types/         # TypeScript type definitions
```

## Core Types

The main business entities are defined in `src/types/index.ts`:
- **User**: Base user type with role-based extensions (Customer, Cleaner)
- **Order**: Central entity with typical order workflow (pending → assigned → picked_up → in_progress → ready_for_delivery → delivered)
- **SubscriptionPlan**: Three tiers with NOK pricing
- **Address**: Norwegian address format with optional coordinates

## Mock Frontend States

Since this is a frontend-only demo without backend integration, the dashboard uses mock customer journey states to showcase different user scenarios:
- **CustomerJourneyState**: awaiting_bag → no_active_order → active_order → multiple_active_orders
- These are UI demonstration states only, not database entities
- Used to show different customer experience flows in the dashboard

## Key Patterns

- Use Norwegian language for user-facing content (app title: "RenVask - Aldri vask klær igjen")
- TypeScript strict mode enabled
- Geist fonts (sans and mono) loaded via next/font/google
- Role-based user types with specific properties per role
- Mock customer journey states for UI demo: awaiting_bag → no_active_order → active_order → multiple_active_orders

## Business Context

Focus on Norwegian market requirements:
- NOK currency for all pricing
- Norwegian address format (street, city, postalCode, country)
- Service areas limited to Bergen and Oslo
- Integration considerations for Vipps payments and Norwegian banking