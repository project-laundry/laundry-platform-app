import Link from 'next/link';
import { ArrowRight, WashingMachine } from 'lucide-react';

export function EmptySubscriptionState() {
  return (
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-10 text-center shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500 sm:p-12">
      <div className="flex flex-col items-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          <WashingMachine className="size-8" />
        </span>

        <h3 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray sm:text-4xl">
          Bestill din første klesvask
        </h3>
        <p className="mt-3 max-w-md text-medium-gray">
          Velg en plan som passer best for deg og la oss ta oss av klesvasken.
        </p>
      </div>

      <Link
        href="/orders/wash"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Bestill klesvask
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
