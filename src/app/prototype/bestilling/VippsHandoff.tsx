'use client';

// The prototype ends here: where the real flow hands off to Vipps to approve
// the payment *agreement* (Vipps Recurring). No money is taken at this point —
// the charge happens later, after the cleaner prices the picked-up laundry.

import { useEffect, useState } from 'react';

export function VippsHandoff({
  estimateLabel,
  onClose,
}: {
  estimateLabel: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'redirecting' | 'stopped'>('redirecting');

  useEffect(() => {
    const t = setTimeout(() => setPhase('stopped'), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-dark-gray/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Vipps-branded header */}
        <div
          className="flex flex-col items-center px-6 py-8 text-white"
          style={{ backgroundColor: '#FF5B24' }}
        >
          <span className="font-serif text-3xl font-bold lowercase tracking-tight">
            vipps
          </span>
          <p className="mt-1 text-sm text-white/90">Betalingsavtale · NooraCare</p>
        </div>

        <div className="px-6 py-6 text-center">
          {phase === 'redirecting' ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <span
                className="size-7 animate-spin rounded-full border-2 border-cream-dark"
                style={{ borderTopColor: '#FF5B24' }}
              />
              <p className="text-medium-gray">Sender deg til Vipps …</p>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-xl font-semibold text-dark-gray">
                Godkjenn avtalen i Vipps
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-medium-gray">
                I den ekte appen godkjenner du nå en betalingsavtale med
                NooraCare i Vipps.{' '}
                <span className="font-medium text-dark-gray">
                  Du blir ikke belastet nå
                </span>{' '}
                – beløpet trekkes først etter at klærne er hentet og priset.
              </p>

              <div className="mt-4 rounded-2xl bg-cream/70 px-4 py-3 text-sm text-medium-gray">
                Estimert pr. henting:{' '}
                <span className="font-medium text-dark-gray">{estimateLabel}</span>
              </div>

              <p className="mt-3 text-xs text-medium-gray">
                Prototypen stopper her – ingen ekte avtale opprettes.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full rounded-full bg-nordic-blue py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Tilbake til oppsummering
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
