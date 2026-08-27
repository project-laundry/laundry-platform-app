'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — Cleaner dashboard shell wiring the two flows into tabs:
//   • Kjøreplan  → <KjoreplanView />  (daily pickup/delivery route)
//   • Vaskerom   → <VaskeromView />   (order-centric cleaning + registration)
//
// Both views stay mounted (hidden, not unmounted) so each keeps its own state
// and the tab badges stay live — advancing an order on Vaskerom keeps its count
// current even while you're looking at Kjøreplan. Mock-only: no server.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { Route, WashingMachine } from 'lucide-react';
import { KjoreplanView } from '../kjoreplan/KjoreplanView';
import { VaskeromView } from '../vaskerom/VaskeromView';

type Tab = 'kjoreplan' | 'vaskerom';

const CLEANER_NAME = 'Sofie';

export default function DashboardPrototypePage() {
  const [tab, setTab] = useState<Tab>('kjoreplan');
  const [stopsLeft, setStopsLeft] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);

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

      {/* Prototype banner */}
      <div className="bg-yellow-100 px-4 py-2 text-center text-xs font-medium text-yellow-800">
        Prototype – testdata, ingen ekte ordrer
      </div>

      {/* App header */}
      <header className="bg-warm-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 pb-3 pt-4">
          <div>
            <Link href="/prototype" className="text-xl font-bold text-nordic-blue">
              NooraCare
            </Link>
            <p className="font-serif text-lg text-dark-gray">
              Hei, {CLEANER_NAME}!
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-full bg-sea-green/12 font-semibold text-sea-green">
            {CLEANER_NAME.charAt(0)}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-0 z-30 border-y border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto flex max-w-2xl">
          <TabButton
            active={tab === 'kjoreplan'}
            onClick={() => setTab('kjoreplan')}
            Icon={Route}
            label="Kjøreplan"
            badge={stopsLeft}
          />
          <TabButton
            active={tab === 'vaskerom'}
            onClick={() => setTab('vaskerom')}
            Icon={WashingMachine}
            label="Vaskerom"
            badge={activeOrders}
          />
        </div>
      </nav>

      {/* Tab panels — both mounted; inactive one hidden so its state persists.
          The pb-28 lives on the Kjøreplan panel only: it clears the fixed
          StickyNextBar, which the Vaskerom tab doesn't render. */}
      <main className="mx-auto max-w-2xl px-5 py-6">
        <div className={tab === 'kjoreplan' ? 'pb-28' : 'hidden'}>
          <KjoreplanView onRemainingChange={setStopsLeft} embedded />
        </div>
        <div className={tab === 'vaskerom' ? '' : 'hidden'}>
          <VaskeromView onActiveChange={setActiveOrders} embedded />
        </div>
      </main>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  Icon: typeof Route;
  label: string;
  badge: number;
}

function TabButton({ active, onClick, Icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-sea-green text-sea-green'
          : 'text-medium-gray hover:text-dark-gray'
      }`}
    >
      <Icon className="size-4" />
      {label}
      {badge > 0 && (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
            active
              ? 'bg-sea-green/12 text-sea-green'
              : 'bg-cream-dark/60 text-medium-gray'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
