'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — "Vaskerom" (cleaning workflow board), standalone.
//
// Mock-only UX prototype. Page chrome only; the flow lives in <VaskeromView />
// (shared with the dashboard tabs). No server, no auth, no DB.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { VaskeromView } from './VaskeromView';

export default function VaskeromPrototypePage() {
  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <div className="bg-yellow-100 px-4 py-2 text-center text-xs font-medium text-yellow-800">
        Prototype – testdata, ingen ekte ordrer
      </div>

      <header className="border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link href="/prototype" className="text-xl font-bold text-nordic-blue">
            NooraCare
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <VaskeromView />
      </main>
    </div>
  );
}
