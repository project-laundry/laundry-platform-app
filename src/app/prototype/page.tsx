'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — index / launcher. One URL for testers to reach every mock flow.
// Mock-only: no server, no auth, no DB. Delete the prototype folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronRight, LayoutDashboard, Route, WashingMachine } from 'lucide-react';

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
    description: 'Vaskeflyt med parallelle steg, justerbart antall maskiner og vasketimer.',
    primary: false,
  },
];

export default function PrototypeIndexPage() {
  return (
    <div className="min-h-screen bg-soft-gray">
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

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-serif text-3xl font-semibold text-dark-gray">
          Prototyper
        </h1>
        <p className="mt-1 text-medium-gray">
          Klikkbare UX-skisser for brukertest. Best på mobil.
        </p>

        <ul className="mt-6 space-y-3">
          {PROTOTYPES.map(({ href, Icon, title, description, primary }) => (
            <li key={href}>
              <Link
                href={href}
                className={`group flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-soft ${
                  primary
                    ? 'border-2 border-nordic-blue'
                    : 'border-gray-200 hover:border-nordic-blue/40'
                }`}
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                    primary
                      ? 'bg-nordic-blue text-white'
                      : 'bg-nordic-blue/10 text-nordic-blue'
                  }`}
                >
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-dark-gray">{title}</h2>
                    {primary && (
                      <span className="rounded-full bg-nordic-blue/10 px-2 py-0.5 text-xs font-medium text-nordic-blue">
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
