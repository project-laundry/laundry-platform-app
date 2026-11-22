import type { MetadataRoute } from 'next';
import { SITEMAP_PATHS, SITE_URL } from '@/lib/config/site';

// /sitemap.xml — the public marketing and legal pages on the canonical host.
export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
  }));
}
