import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/** The NooraCare wordmark (BRANDBOOK §2). Use this everywhere the logo appears
 *  so the treatment can't drift. */
export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="font-serif text-2xl font-semibold text-nordic-blue">
      NooraCare
    </Link>
  );
}

/** "‹ Tilbake" link, rendered at the top of the page's content column — never
 *  inside the header bar, so the wordmark keeps its fixed spot. */
export function BackLink({ href, label = 'Tilbake' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
    >
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  );
}

/**
 * The shared app header bar (BRANDBOOK §4 "Page shell"). One convention for
 * every page: sticky translucent warm-white bar with the wordmark anchored
 * left — it never moves between pages. `right` holds page-specific content
 * (user name + logout, order number, status badge); back links go in the
 * content column via `BackLink`.
 */
export function AppHeader({
  right,
  maxWidth = 'max-w-2xl',
}: {
  /** Right-slot content (optional). */
  right?: React.ReactNode;
  /** Tailwind max-width class matching the page's content column. */
  maxWidth?: 'max-w-2xl' | 'max-w-4xl' | 'max-w-5xl';
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur">
      <div
        className={`mx-auto flex ${maxWidth} items-center justify-between gap-4 px-5 py-3`}
      >
        <Wordmark />
        {right}
      </div>
    </header>
  );
}
