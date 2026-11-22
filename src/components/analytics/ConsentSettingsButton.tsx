'use client';

// "Change my answer" link on the privacy pages: shows the consent banner
// again. Does nothing where analytics does not run (the banner stays hidden).

import { OPEN_CONSENT_EVENT } from '@/components/analytics/ConsentBanner';

export function ConsentSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
    >
      Endre valget ditt
    </button>
  );
}
