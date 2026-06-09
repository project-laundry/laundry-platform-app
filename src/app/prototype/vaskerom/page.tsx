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
    <div className="min-h-screen bg-soft-gray pb-12">
      <div className="bg-yellow-100 px-4 py-2 text-center text-xs font-medium text-yellow-800">
        Prototype – testdata, ingen ekte ordrer
      </div>

      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-nordic-blue">
            NooraCare
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <VaskeromView />
      </main>
    </div>
  );
}
