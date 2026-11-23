'use client';

import { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';

/**
 * Shows a spinner in place of a link's icon while that link's page is
 * loading. Must be rendered inside a next/link <Link>. `className` is the
 * icon's own size/colour classes, so the spinner takes exactly its place.
 */
export function LinkPendingIcon({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{children}</>;
  return <Loader2 aria-hidden className={`${className} animate-spin`} />;
}
