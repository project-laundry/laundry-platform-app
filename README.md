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

## Register vipps webhook

First fetch a token

```bash
curl -X POST 'https://apitest.vipps.no/accesstoken/get' \
-H "Content-Type: application/json" \
-H 'client_id: 363e40cc-cb69-4624-93a6-ba14b84985aa' \
-H 'client_secret: cre8Q~u9Y9nmtGMVOJkqFpqbWUm6BFCMZNdCicL3' \
-H 'Ocp-Apim-Subscription-Key: 32d03ef6150cddb7a4a35624fcfd1a96' \
-H 'Merchant-Serial-Number: 427700' \
--data ''
```

Then register the webhook

```bash
curl -X POST https://apitest.vipps.no/webhooks/v1/webhooks \
-H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyIsImtpZCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyJ9.eyJhdWQiOiIzNjNlNDBjYy1jYjY5LTQ2MjQtOTNhNi1iYTE0Yjg0OTg1YWEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9lNTExNjUyNi01MWRjLTRjMTQtYjA4Ni1hNWNiNDcxNmJjNGIvIiwiaWF0IjoxNzY1NDY2MjMyLCJuYmYiOjE3NjU0NjYyMzIsImV4cCI6MTc2NTQ3MDEzMiwiYWlvIjoiazJKZ1lQaFM5WWxobHBPMU1NdnVSMWFLRE9VbkFRPT0iLCJhcHBpZCI6IjM2M2U0MGNjLWNiNjktNDYyNC05M2E2LWJhMTRiODQ5ODVhYSIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2U1MTE2NTI2LTUxZGMtNGMxNC1iMDg2LWE1Y2I0NzE2YmM0Yi8iLCJvaWQiOiJkNGYyNzlmNi1mZDI5LTRjYzQtYThiYy1lNjg5MTE2NDllNTQiLCJyaCI6IjEuQVNBQUptVVI1ZHhSRkV5d2hxWExSeGE4Uzh4QVBqWnB5eVJHazZhNkZMaEpoYW85QVFBZ0FBLiIsInN1YiI6ImQ0ZjI3OWY2LWZkMjktNGNjNC1hOGJjLWU2ODkxMTY0OWU1NCIsInRpZCI6ImU1MTE2NTI2LTUxZGMtNGMxNC1iMDg2LWE1Y2I0NzE2YmM0YiIsInV0aSI6IkxXLWJnaHVrUmtPMHdSUFNPWEVTQUEiLCJ2ZXIiOiIxLjAiLCJ4bXNfZnRkIjoiZ2FSbmVVb0VtWUw1d01IeTFkUl9lbHAtcnBZeWhuMFdPY1dUbTVXejZQb0JjM2RsWkdWdVl5MWtjMjF6In0.hJ325vAvCRNdtKmHqgyUT0Zh4bFvw-TdBegW6SnqyYg3hem2xuZx50wSMspDFPVl_Cdr6QgJq9rHbNH8XQ5O3myGP7jWWmPbjq7J1ejG4EcJ5ujErCilD25Y3k6uIaNV6rUnWC5jQMUM2leF8dop6ZkPuKw75EtI076UeWPJ7qV6b3G5y2wdVipMFVnJi9nH908RPRBDChRvCGxHvhREBQb-1MaXZEB4GTyHT2ruD9q3_pX-IIixQgZrh7M_0xQFhag7tTnGm-yW1aJjM2yptZYK-xax5_igWto8Lbx4j043HrorDXM84AZLdQHFkwwsPVQX_gQC5ACwmH2ul9OEuQ" \
-H "Ocp-Apim-Subscription-Key: 32d03ef6150cddb7a4a35624fcfd1a96" \
-H "Merchant-Serial-Number: 427700" \
--data '{
    "url": "https://charlotte-unbearing-odiously.ngrok-free.dev/api/webhooks/vipps",
    "events": ["epayments.payment.created.v1"]
}'
```


```bash
curl -X GET https://apitest.vipps.no/webhooks/v1/webhooks \
-H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyIsImtpZCI6InJ0c0ZULWItN0x1WTdEVlllU05LY0lKN1ZuYyJ9.eyJhdWQiOiIzNjNlNDBjYy1jYjY5LTQ2MjQtOTNhNi1iYTE0Yjg0OTg1YWEiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9lNTExNjUyNi01MWRjLTRjMTQtYjA4Ni1hNWNiNDcxNmJjNGIvIiwiaWF0IjoxNzY1NDY2MjMyLCJuYmYiOjE3NjU0NjYyMzIsImV4cCI6MTc2NTQ3MDEzMiwiYWlvIjoiazJKZ1lQaFM5WWxobHBPMU1NdnVSMWFLRE9VbkFRPT0iLCJhcHBpZCI6IjM2M2U0MGNjLWNiNjktNDYyNC05M2E2LWJhMTRiODQ5ODVhYSIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2U1MTE2NTI2LTUxZGMtNGMxNC1iMDg2LWE1Y2I0NzE2YmM0Yi8iLCJvaWQiOiJkNGYyNzlmNi1mZDI5LTRjYzQtYThiYy1lNjg5MTE2NDllNTQiLCJyaCI6IjEuQVNBQUptVVI1ZHhSRkV5d2hxWExSeGE4Uzh4QVBqWnB5eVJHazZhNkZMaEpoYW85QVFBZ0FBLiIsInN1YiI6ImQ0ZjI3OWY2LWZkMjktNGNjNC1hOGJjLWU2ODkxMTY0OWU1NCIsInRpZCI6ImU1MTE2NTI2LTUxZGMtNGMxNC1iMDg2LWE1Y2I0NzE2YmM0YiIsInV0aSI6IkxXLWJnaHVrUmtPMHdSUFNPWEVTQUEiLCJ2ZXIiOiIxLjAiLCJ4bXNfZnRkIjoiZ2FSbmVVb0VtWUw1d01IeTFkUl9lbHAtcnBZeWhuMFdPY1dUbTVXejZQb0JjM2RsWkdWdVl5MWtjMjF6In0.hJ325vAvCRNdtKmHqgyUT0Zh4bFvw-TdBegW6SnqyYg3hem2xuZx50wSMspDFPVl_Cdr6QgJq9rHbNH8XQ5O3myGP7jWWmPbjq7J1ejG4EcJ5ujErCilD25Y3k6uIaNV6rUnWC5jQMUM2leF8dop6ZkPuKw75EtI076UeWPJ7qV6b3G5y2wdVipMFVnJi9nH908RPRBDChRvCGxHvhREBQb-1MaXZEB4GTyHT2ruD9q3_pX-IIixQgZrh7M_0xQFhag7tTnGm-yW1aJjM2yptZYK-xax5_igWto8Lbx4j043HrorDXM84AZLdQHFkwwsPVQX_gQC5ACwmH2ul9OEuQ" \
-H "Ocp-Apim-Subscription-Key: 32d03ef6150cddb7a4a35624fcfd1a96" \
-H "Merchant-Serial-Number: 427700" \
--data ''
```


| 'epayments.payment.created.v1'
  | 'epayments.payment.aborted.v1'
  | 'epayments.payment.expired.v1'
  | 'epayments.payment.cancelled.v1'
  | 'epayments.payment.captured.v1'
  | 'epayments.payment.refunded.v1'
  | 'epayments.payment.authorized.v1'
  | 'epayments.payment.terminated.v1';