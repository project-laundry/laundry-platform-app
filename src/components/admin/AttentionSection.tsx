// One section of the admin overview's attention lists: icon chip + serif
// title + count badge, then a dense row list (brandbook §4 "Card / section").
// `rows === null` means the query failed and renders an error strip —
// never an empty list.

import Link from 'next/link';
import { AlertCircle, type LucideIcon } from 'lucide-react';

export interface AttentionRow {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  meta: string;
  metaTone?: 'neutral' | 'warning' | 'destructive';
}

const META_CLASSES: Record<NonNullable<AttentionRow['metaTone']>, string> = {
  neutral: 'text-medium-gray',
  warning: 'text-amber-800',
  destructive: 'text-red-700',
};

const BADGE_CLASSES = {
  info: 'bg-sea-green/10 text-sea-green',
  warning: 'bg-amber-50 text-amber-800',
  destructive: 'bg-red-50 text-red-700',
} as const;

export function AttentionSection({
  title,
  icon: Icon,
  tone,
  rows,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  tone: keyof typeof BADGE_CLASSES;
  rows: AttentionRow[] | null;
  emptyText: string;
}) {
  const count = rows === null ? 0 : rows.length;

  return (
    <section className="overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span
          className={`flex size-9 items-center justify-center rounded-full ${
            count > 0 && tone !== 'info' ? BADGE_CLASSES[tone] : 'bg-sea-green/12 text-sea-green'
          }`}
        >
          <Icon className="size-5" />
        </span>
        <h2 className="font-serif text-lg font-semibold text-dark-gray">{title}</h2>
        {count > 0 && (
          <span
            className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${BADGE_CLASSES[tone]}`}
          >
            {count}
          </span>
        )}
      </div>

      {rows === null ? (
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>Kunne ikke hente listen. Last siden på nytt.</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-medium-gray">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
          {rows.map((row) => (
            <li key={row.key}>
              <Link href={row.href} className="block px-5 py-3 transition-colors hover:bg-cream/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-dark-gray">{row.title}</p>
                    <p className="mt-0.5 truncate text-sm text-medium-gray">{row.subtitle}</p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      META_CLASSES[row.metaTone ?? 'neutral']
                    }`}
                  >
                    {row.meta}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
