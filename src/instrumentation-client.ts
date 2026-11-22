// Next.js convention: runs in the browser after the document loads and
// before hydration. Keep it synchronous. Analytics only starts on the hosts
// in src/lib/analytics/config.ts and only when the key is set at build time.

import { initAnalytics } from '@/lib/analytics/posthog';

initAnalytics({
  // Literal process.env.NEXT_PUBLIC_… read so Next inlines the value.
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  hostname: window.location.hostname,
});
