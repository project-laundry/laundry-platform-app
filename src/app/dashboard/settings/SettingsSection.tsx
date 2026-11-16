import type { ReactNode } from 'react';
import { AlertCircle, Check } from 'lucide-react';

/**
 * Card + heading shell for one settings section — the same recipe as the
 * cleaner settings form (sectionClass + SectionHeading in
 * CleanerSettingsForm.tsx), shared here by the three customer forms.
 */
export function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          {icon}
        </span>
        <h2 className="font-serif text-lg font-semibold text-dark-gray">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export type SaveMessageState = { kind: 'success' | 'error'; text: string } | null;

/** Inline result box shown under a section's save button. */
export function SaveMessage({ message }: { message: SaveMessageState }) {
  if (!message) return null;
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-sm ${
        message.kind === 'success' ? 'bg-sea-green/10 text-sea-green' : 'bg-red-50 text-red-700'
      }`}
    >
      {message.kind === 'success' ? (
        <Check className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{message.text}</span>
    </div>
  );
}

/** Compact save button — the same recipe EditableAddress uses for "Lagre". */
export const SAVE_BUTTON_CLASS =
  'mt-4 inline-flex items-center gap-2 rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none';

/** Input recipe for the hand-written phone/password inputs (same as FormInput). */
export const INPUT_CLASS =
  'w-full rounded-2xl border bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray';
