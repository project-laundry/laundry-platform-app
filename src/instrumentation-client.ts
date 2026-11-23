// Next.js convention: runs in the browser after the document loads and
// before hydration. Keep it synchronous. Analytics only starts on the hosts
// in src/lib/analytics/config.ts and only when the key is set at build time.
// onRouterTransitionStart (bottom) reports every navigation start to the
// progress bar.

import { initAnalytics } from '@/lib/analytics/posthog';
import { notifyNavigationStart } from '@/lib/navigation/progress';

initAnalytics({
  // Literal process.env.NEXT_PUBLIC_… read so Next inlines the value.
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  hostname: window.location.hostname,
});

// Next.js calls this at the start of every App Router navigation (link click,
// router.push/replace, back/forward), synchronously inside the navigation
// transition. It drives the top progress bar (components/ui/NavigationProgress).
export function onRouterTransitionStart() {
  notifyNavigationStart();
}
