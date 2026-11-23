// Bridge between Next's navigation-start hook (src/instrumentation-client.ts)
// and the NavigationProgress component in the root layout. The hook runs
// outside React, so it reaches the component through this one listener.

type Listener = () => void;

let listener: Listener | null = null;

/** Called by NavigationProgress on mount (and with null on unmount). */
export function setNavigationStartListener(next: Listener | null): void {
  listener = next;
}

/** Called synchronously by onRouterTransitionStart, inside the navigation transition. */
export function notifyNavigationStart(): void {
  listener?.();
}
