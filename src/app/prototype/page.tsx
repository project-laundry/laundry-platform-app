'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — index / launcher. One URL for testers to reach every mock flow.
// Mock-only: no server, no auth, no DB. Delete the prototype folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import {
  ChevronRight,
  LayoutDashboard,
  Route,
  WashingMachine,
} from 'lucide-react';

const PROTOTYPES = [
  {
    href: '/prototype/dashboard',
    Icon: LayoutDashboard,
    title: 'Renser-dashboard',
    description: 'Full prototype – Kjøreplan og Vaskerom samlet i faner.',
    primary: true,
  },
  {
    href: '/prototype/kjoreplan',
    Icon: Route,
    title: 'Dagens kjøreplan',
    description: 'Optimalisert hente- og leveringsrute med kart.',
    primary: false,
  },
  {
    href: '/prototype/vaskerom',
    Icon: WashingMachine,
    title: 'Vaskerom',
    description: 'Ordreflyt – registrer vask og stryk per ordre, fullfør og belast.',
    primary: false,
  },
];

export default function PrototypeIndexPage() {
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
          <Link href="/" className="text-xl font-bold text-nordic-blue">
            NooraCare
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
          NooraCare
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
          Prototyper
        </h1>
        <p className="mt-3 max-w-md text-medium-gray">
          Klikkbare UX-skisser for brukertest. Best på mobil.
        </p>

        <ul className="mt-8 space-y-3">
          {PROTOTYPES.map(({ href, Icon, title, description, primary }, i) => (
            <li
              key={href}
              className="animate-in fade-in slide-in-from-bottom-3 duration-700"
              style={{ animationDelay: `${80 * (i + 1)}ms` }}
            >
              <Link
                href={href}
                className={`group flex items-center gap-4 rounded-3xl border bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                  primary
                    ? 'border-2 border-sea-green'
                    : 'border-cream-dark/80 hover:border-sea-green/50'
                }`}
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                    primary
                      ? 'bg-sea-green text-white'
                      : 'bg-sea-green/12 text-sea-green'
                  }`}
                >
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-lg font-semibold text-dark-gray">
                      {title}
                    </h2>
                    {primary && (
                      <span className="rounded-full bg-sea-green/12 px-2 py-0.5 text-xs font-medium text-sea-green">
                        Start her
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-medium-gray">{description}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-medium-gray transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
