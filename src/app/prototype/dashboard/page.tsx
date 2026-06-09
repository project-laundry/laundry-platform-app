'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — Cleaner dashboard shell wiring the two flows into tabs:
//   • Kjøreplan  → <KjoreplanView />  (daily pickup/delivery route)
//   • Vaskerom   → <VaskeromView />   (parallel cleaning workflow)
//
// Both views stay mounted (hidden, not unmounted) so timers keep running and the
// tab badges stay live — e.g. a machine finishing while you're on Kjøreplan
// pulses an alert on the Vaskerom tab. Mock-only: no server, no auth, no DB.
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
  const [washAlerts, setWashAlerts] = useState(0);

  return (
    <div className="min-h-screen bg-soft-gray pb-28">
      {/* Prototype banner */}
      <div className="bg-yellow-100 px-4 py-2 text-center text-xs font-medium text-yellow-800">
        Prototype – testdata, ingen ekte ordrer
      </div>

      {/* App header */}
      <header className="bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pb-3 pt-4">
          <div>
            <Link href="/" className="text-xl font-bold text-nordic-blue">
              NooraCare
            </Link>
            <p className="font-serif text-lg text-dark-gray">
              Hei, {CLEANER_NAME}!
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-full bg-nordic-blue/10 font-semibold text-nordic-blue">
            {CLEANER_NAME.charAt(0)}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-0 z-30 border-y border-gray-200 bg-white/95 backdrop-blur">
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
            badge={washAlerts}
            urgent={washAlerts > 0}
          />
        </div>
      </nav>

      {/* Tab panels — both mounted; inactive one hidden so its timers keep running */}
      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className={tab === 'kjoreplan' ? '' : 'hidden'}>
          <KjoreplanView onRemainingChange={setStopsLeft} />
        </div>
        <div className={tab === 'vaskerom' ? '' : 'hidden'}>
          <VaskeromView onNeedsActionChange={setWashAlerts} />
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
  urgent?: boolean;
}

function TabButton({ active, onClick, Icon, label, badge, urgent }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-nordic-blue text-nordic-blue'
          : 'text-medium-gray hover:text-dark-gray'
      }`}
    >
      <Icon className="size-4" />
      {label}
      {badge > 0 && (
        <span
          className={`inline-flex min-w-5 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
            urgent
              ? 'bg-amber-500 text-white'
              : active
                ? 'bg-nordic-blue/10 text-nordic-blue'
                : 'bg-gray-100 text-medium-gray'
          }`}
        >
          {urgent && (
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
          )}
          {badge}
        </span>
      )}
    </button>
  );
}
