'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Masks a sensitive onboarding value (tax id, bank account) to its last three
 * digits until the admin taps the eye. A shoulder-surfing guard on an
 * admin-only page — the full value is still in the page's HTML.
 */
export function RevealField({ value, label }: { value: string; label: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = '•'.repeat(Math.max(value.length - 3, 0)) + value.slice(-3);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium tabular-nums text-dark-gray">{revealed ? value : masked}</span>
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? `Skjul ${label}` : `Vis ${label}`}
        className="text-medium-gray transition-colors hover:text-nordic-blue"
      >
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
