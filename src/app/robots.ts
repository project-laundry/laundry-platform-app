import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { ROBOTS_DISALLOW, SITE_URL, isIndexableHost } from '@/lib/config/site';

// /robots.txt. Reads the request host, so it is rendered per request: only
// nooracare.no may be indexed; staging, previews and localhost answer
// "Disallow: /".
export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  if (!isIndexableHost(host)) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ROBOTS_DISALLOW },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
