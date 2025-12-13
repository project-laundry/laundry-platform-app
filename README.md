This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Webhook Configuration in Vipps Dashboard

Register these two webhooks in your Vipps dashboard:

  Webhook 1: Recurring Payments

- URL: <https://yourdomain.com/api/webhooks/vipps/recurring>
- Events to subscribe:
  - recurring.charge.reserved.v1
  - recurring.charge.captured.v1
  - recurring.charge.canceled.v1
  - recurring.charge.refunded.v1
  - recurring.charge.failed.v1
  - recurring.charge.creation-failed.v1
  - recurring.agreement.activated.v1
  - recurring.agreement.rejected.v1
  - recurring.agreement.stopped.v1
  - recurring.agreement.expired.v1

  Webhook 2: One-Time Payments

- URL: <https://yourdomain.com/api/webhooks/vipps/epayment>
- Events to subscribe:
  - epayments.payment.created.v1
  - epayments.payment.authorized.v1
  - epayments.payment.captured.v1
  - epayments.payment.refunded.v1
  - epayments.payment.cancelled.v1
  - epayments.payment.aborted.v1
  - epayments.payment.expired.v1
  - epayments.payment.terminated.v1

  Environment Variables

  You can use either a shared secret or separate secrets:

  Option 1: Shared Secret (simpler)
  VIPPS_WEBHOOK_SECRET=your-webhook-secret

  Option 2: Separate Secrets (more secure)
  VIPPS_WEBHOOK_SECRET_RECURRING=your-recurring-webhook-secret
  VIPPS_WEBHOOK_SECRET_EPAYMENT=your-epayment-webhook-secret

  The webhook utility will try the endpoint-specific secret first, then fall back to the shared secret if not found.
