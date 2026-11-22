'use client';

// The cookie banner. Shown until the visitor answers, and again when they
// ask to change their answer (ConsentSettingsButton on the privacy pages).
// «Avvis» and «Godta» look the same on purpose: refusing must be as easy as
// accepting. Before an answer, and after «Avvis», analytics stays cookieless
// and nothing is recorded (lib/analytics/posthog.ts). Renders nothing where
// analytics does not run (localhost, previews, no key).

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  acceptAnalytics,
  analyticsConsent,
  declineAnalytics,
  subscribeConsent,
  syncRecording,
} from '@/lib/analytics/posthog';

/** Dispatch on `window` to show the banner again. */
export const OPEN_CONSENT_EVENT = 'nooracare:open-consent';

const choiceButton =
  'inline-flex flex-1 items-center justify-center rounded-full border border-fjord bg-white px-5 py-2.5 text-sm font-medium text-fjord transition-all hover:bg-fjord hover:text-white active:scale-[0.98]';

export function ConsentBanner() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, analyticsConsent, () => 'off' as const);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  // Replay follows the answer and the page: only with «Godta», never on the
  // pages with personal data.
  useEffect(() => {
    syncRecording(pathname);
  }, [pathname, consent]);

  if (consent === 'off' || (consent !== 'pending' && !reopened)) return null;

  const answer = (accepted: boolean) => {
    if (accepted) acceptAnalytics();
    else declineAnalytics();
    setReopened(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Samtykke til statistikk og opptak"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-xl rounded-3xl border border-cream-dark bg-white p-5 shadow-[var(--shadow-card)]">
        <p className="font-serif text-lg font-semibold text-dark-gray">Får vi se hvordan du bruker siden?</p>
        <p className="mt-2 text-sm leading-relaxed text-medium-gray">
          Sier du ja, bruker vi informasjonskapsler til statistikk og tar opp besøket ditt – hvor du klikker
          og ruller, aldri det du skriver. Sier du nei, måler vi bare anonym bruk uten informasjonskapsler.{' '}
          <Link href="/personvern#informasjonskapsler" className="text-nordic-blue underline underline-offset-2">
            Les mer
          </Link>
        </p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => answer(false)} className={choiceButton}>
            Avvis
          </button>
          <button type="button" onClick={() => answer(true)} className={choiceButton}>
            Godta
          </button>
        </div>
      </div>
    </div>
  );
}
