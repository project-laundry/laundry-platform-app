'use client';

import { useEffect, useOptimistic } from 'react';
import { setNavigationStartListener } from '@/lib/navigation/progress';

/**
 * Thin bar at the top of the screen while a page navigation is loading.
 * Mounted once in the root layout.
 *
 * `pending` is optimistic state set from Next's onRouterTransitionStart hook
 * (src/instrumentation-client.ts). The hook runs inside the navigation's
 * transition, so React resets `pending` to false by itself when the
 * navigation is done — no pathname watching, no timers. The 150 ms delay
 * and the creeping are CSS (.nav-progress in globals.css).
 */
export function NavigationProgress() {
  const [pending, setPending] = useOptimistic(false);

  useEffect(() => {
    setNavigationStartListener(() => setPending(true));
    return () => setNavigationStartListener(null);
  }, [setPending]);

  return <div aria-hidden className={pending ? 'nav-progress is-pending' : 'nav-progress'} />;
}
