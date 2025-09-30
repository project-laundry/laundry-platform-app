# Peer-to-Peer Laundry Platform - Product Requirements Document

## 1. Executive Summary

### Product Vision
A peer-to-peer laundry platform that connects busy professionals and families with local cleaners, replacing traditional "laundry day" through convenient pickup/delivery service in Bergen and Oslo, Norway.

### Key Value Propositions
- **For Customers**: Eliminate laundry day stress with reliable pickup/delivery service
- **For Cleaners**: Flexible side income opportunity with mission-based work
- **Platform**: Subscription-based revenue model with supply chain integration

---

## 2. Business Model

### Revenue Streams
- **Primary**: Subscription fees from customers (500-2000 NOK/month)

### Pricing Structure
- **Starter Plan**: 500 NOK/month (basic service)
- **Family Plan**: 1000 NOK/month (higher volume)
- **Premium Plan**: 2000 NOK/month (priority service, premium care)

### Cleaner Compensation
- Mission-based payment system (similar to Uber model)
- Multiple service tiers with different rates

---

## 3. Market Analysis

### Target Markets
- **Primary Cities**: Bergen and Oslo, Norway
- **Launch Strategy**: Gradual rollout starting with one city

### Customer Segments
**Primary Users (Customers)**:
- Busy professionals (25-45 years)
- Families with children
- High disposable income households

**Service Providers (Cleaners)**:
- Students seeking flexible income
- Elderly looking for supplemental income
- Individuals unable to work traditional jobs due to illness
- Anyone seeking side income with flexible hours

### Competitive Landscape
- **Existing**: Traditional pickup cleaners
- **Gap**: No peer-to-peer laundry platforms currently in market
- **Differentiation**: P2P model, subscription pricing, integrated supply chain

---

## 4. Product Features & Requirements

### 4.1 Core Platform Features

#### Order Management
**Account Management**:
- User registration and profile creation
- Subscription plan selection and management
- Payment method setup (credit card, Vipps)
- Address and pickup preferences
- Laundry bag delivery tracking and confirmation

**Order Management**:
- Schedule pickup requests (only after bag delivery confirmed)
- Specify laundry types (everyday clothes, delicates)
- Special instructions and preferences
- Order history and tracking

**Service Interaction**:
- Real-time order tracking
- Communication with assigned cleaner
- Rating and review system (post-service)
- Customer support access (email, future chat)

#### Cleaner App Features
**Profile Management**:
- Cleaner registration and verification
- Service tier selection and pricing
- Availability calendar management
- Banking/payment information

**Mission Management**:
- Browse available missions
- Accept/decline mission requests
- Mission details and customer preferences
- Earnings tracking and history

**Service Delivery**:
- Mission status updates
- Photo documentation (pickup/delivery)
- Customer communication tools
- Supply ordering system

#### Admin Dashboard
**User Management**:
- Customer subscription management
- Cleaner verification and onboarding
- User support and dispute resolution

**Operations**:
- Mission assignment and routing
- Quality control monitoring
- Financial reporting and payouts
- Supply inventory management

### 4.2 Technical Requirements

#### Core Infrastructure
- **Platform**: Web application with mobile-responsive design
- **Database**: User profiles, orders, payments, ratings
- **Payment Processing**: Integration with Norwegian payment systems (Vipps, credit cards)
- **Real-time Updates**: Order tracking and status notifications

#### Security & Compliance
- **Data Protection**: GDPR compliance
- **Insurance**: Platform liability and item protection

---

## 5. User Journey & Experience

### 5.1 Customer Journey
1. **Discovery & Signup**: Visit landing page → Sign up/log inn → Select subscription plan → Add payment method
2. **Bag Delivery**: Receive branded laundry bag → Activate account → Ready to place orders
3. **First Order**: Set pickup preferences → Schedule first pickup → Receive confirmation
4. **Service Experience**: Pickup notification → Real-time tracking → Delivery notification
5. **Post-Service**: Rate cleaner → Review service → Schedule next pickup
6. **Ongoing**: Regular pickup schedule → Manage preferences → Customer support when needed

### 5.2 Cleaner Journey
1. **Onboarding**: Apply to join → Verification process → Training/certification
2. **Setup**: Complete profile → Set availability → Order supplies
3. **First Mission**: Browse available missions → Accept mission → Pickup instructions
4. **Service Delivery**: Pickup → Cleaning → Photo documentation → Delivery
5. **Growth**: Build ratings → Access higher-tier missions → Increase earnings

---

## 6. Quality Control & Safety Framework

### Cleaner Vetting Process (Recommendations)
- **Identity Verification**: Norwegian ID validation
- **Training Program**: Platform standards and best practices

### Quality Assurance
- **Rating System**: 5-star rating with detailed feedback
- **Photo Documentation**: Before/after photos for transparency
- **Customer Feedback**: Immediate post-service surveys
- **Quality Audits**: Random quality checks on completed orders
- **Cleaner Tiers**: Performance-based tier system with incentives

### Insurance & Protection
- **Item Insurance**: Coverage for lost/damaged items (up to specified limits)
- **Platform Liability**: General liability insurance
- **Cleaner Protection**: Basic accident insurance during missions

---

## 7. Operations & Logistics

### Pickup/Delivery Model
**Option A: Dedicated Drivers**
- Platform employs/contracts dedicated pickup/delivery drivers
- Cleaners focus solely on cleaning
- More control over logistics and timing

**Option B: Cleaner-Managed**
- Cleaners handle their own pickup/delivery
- Higher earning potential for cleaners
- Lower platform operational costs

**Recommendation**: Start with Option B, migrate to Option A as scale increases

### Service Standards
- **Bag Delivery**: 3-5 business days after subscription signup
- **Account Activation**: Customer can place orders once bag delivery is confirmed
- **Pickup Window**: 2-hour window slots
- **Turnaround Time**: 2-3 days standard
- **Delivery Window**: 2-hour window slots
- **Communication**: SMS/app notifications at each stage

### Supply Chain
- **Detergent & Supplies**: Platform-provided at cost + small markup
- **Delivery Method**: Include in pickup/delivery routes
- **Inventory**: Track cleaner supply needs via app

---

## 8. Technology Stack

### Frontend
- **Framework**: Next.js with TypeScript
- **Hosting**: Vercel (automatic deployments, serverless functions)
- **UI Framework**: Modern, clean Norwegian-friendly interface

### Backend & Database
- **Backend Service**: Supabase (PostgreSQL database, authentication, real-time subscriptions)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage for images and documents
- **Real-time**: Supabase real-time subscriptions for order tracking

### Integrations
- **Payment**: Vipps API integration, Stripe for cards
- **Notifications**: Push notifications, SMS integration
- **Email**: Email service integration for notifications

### Infrastructure
- **Hosting**: Vercel for frontend, Supabase for backend infrastructure
- **Security**: Row Level Security (RLS) via Supabase, SSL encryption
- **Monitoring**: Vercel Analytics, Supabase monitoring dashboard

---

*This PRD serves as the foundation for development and should be reviewed and updated regularly as the product evolves and market feedback is incorporated.*

## Kjerneprodukt

- Vaskepose (5 kg skittentøy).
- Henting → Vask/stryk → Levering tilbake (innen 48 timer).
- Abonnementsmodeller:
  - Ukentlig (399 kr/mnd).
  - Annenhver uke (249 kr/mnd).
  - Enkeltvask (149–199 kr).
  - Tillegg: Skjorter, kjoler, sengetøy.
