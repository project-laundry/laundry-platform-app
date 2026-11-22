'use client';

// Invisible marker that fires one event the first time it scrolls into view.
// Lets a server component (the how-it-works story) report "section reached"
// without becoming a client component.

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/posthog';
import type { AnalyticsEvent } from '@/lib/analytics/config';

export function TrackSectionView({ event }: { event: AnalyticsEvent }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        track(event);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [event]);

  return <span ref={ref} aria-hidden className="block h-px w-px" />;
}
