import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image';

export const alt = 'NooraCare – Snart slipper du klesvasken. En nabo tar den.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Snart slipper du',
    highlight: 'klesvasken.',
    tagline: 'En nabo vasker. Vi henter og leverer hjem til deg.',
  });
}
