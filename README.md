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


We're going to chage the whole order flow.

When the user want to book a new laundry they will go throught this flow:

1. Select location, Bergen or Oslo (Not available yet but coming soon)
2. Select the service (Washing + ironing or just washing)
3. Select desired pickup date (need to check cleaner availability)
4. Select frequency (first ask if they want a recurring booking. If so then they can choose between weekly/bi-weekly/monthly)
5. Select pick up adress with pick up instructions
6. Optional booking instructions
7. Show booking confirmation
8. Redirect to payment provider

Decide if some of the questions can be shown in the same page.

Additionally:

- subscription plans will be removed
- remove additional services (subscription.default_extra_kg, subscription.default_delicate_items_count, order.extra_kg, )
- Pricing will be based on the number of washing load. Price will be calculated after the laundry has been picked up and cleaner has counted and sorted the items. Cleaner will have to register what have been done to be able to calculate the price. (Don't mind this now. We'll work on this later)
-  The billing/price can vary per order and is not fixed on a subscription. (remove subscription.billing_cost_ore)

Analyse all the changes that needs to be made.
