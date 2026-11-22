// Next.js instrumentation hook. onRequestError receives every error the
// server catches in a page render, route handler or server action — the
// unhandled ones nobody wrapped in a try/catch. They are e-mailed to the
// admins (lib/services/error-alerts.ts). Production builds only, so a local
// `next dev` crash never mails anyone; staging and production both alert.

import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_RUNTIME !== 'nodejs') return;

  // notFound() and redirect() travel as errors with a digest; they are not failures.
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : '';
  if (digest.startsWith('NEXT_')) return;

  const { reportError } = await import('@/lib/services/error-alerts');
  await reportError(`${context.routeType} ${context.routePath}`, error, {
    Metode: request.method,
    // Path only — a query string can carry tokens or personal data.
    Sti: request.path.split('?')[0],
    digest: digest || null,
  });
};
