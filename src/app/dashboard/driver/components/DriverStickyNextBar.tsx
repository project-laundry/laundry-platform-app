'use client';

import { Navigation, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildSingleDestinationUrl } from '@/lib/utils/route';
import type { DriverStop } from '@/lib/services/driver-route';

interface DriverStickyNextBarProps {
  nextStop: DriverStop | null;
  remaining: number;
}

/**
 * Always-visible bottom bar so the repeated action — "navigate to the next
 * stop" — stays under the thumb no matter how far the list is scrolled.
 */
export function DriverStickyNextBar({ nextStop, remaining }: DriverStickyNextBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        {nextStop ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-medium-gray">Neste stopp · {remaining} igjen</p>
              <p className="truncate font-medium text-dark-gray">
                {nextStop.contact_name} · {nextStop.street}
              </p>
            </div>
            {nextStop.latitude !== null && nextStop.longitude !== null && (
              <a
                href={buildSingleDestinationUrl({
                  latitude: nextStop.latitude,
                  longitude: nextStop.longitude,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button variant="hero" size="lg" className="rounded-full">
                  <Navigation className="size-4" />
                  Naviger
                </Button>
              </a>
            )}
          </>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 py-1 font-medium text-sea-green">
            <PartyPopper className="size-5" />
            Alle stopp fullført!
          </div>
        )}
      </div>
    </div>
  );
}
