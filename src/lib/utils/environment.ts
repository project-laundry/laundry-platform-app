// Environment detection derived from NEXT_PUBLIC_APP_URL.
// NEXT_PUBLIC_* vars are inlined at build time, so this works on both
// the server and the client without any extra configuration.

export type AppEnvironment = 'production' | 'staging' | 'development';

/**
 * Determine which environment the app is running in based on its public URL.
 *
 * - localhost / 127.0.0.1            → development
 * - nooracare.no / www.nooracare.no → production
 * - anything else (e.g. staging.nooracare.no, Vercel previews) → staging
 */
export function getAppEnvironment(): AppEnvironment {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // No URL configured (e.g. local dev without .env) → treat as development.
  if (!appUrl) return 'development';

  let hostname: string;
  try {
    hostname = new URL(appUrl).hostname.toLowerCase();
  } catch {
    return 'development';
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }

  if (hostname === 'nooracare.no' || hostname === 'www.nooracare.no') {
    return 'production';
  }

  return 'staging';
}

/** True for any non-production environment. */
export function isNonProduction(): boolean {
  return getAppEnvironment() !== 'production';
}
