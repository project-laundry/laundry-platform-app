import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image';
import { CLEANER_PAYOUT_PER_LOAD_ORE, formatKr } from '@/lib/config/pricing';

export const alt = 'Bli renser hos NooraCare – tjen penger på vaskemaskinen din.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Tjen penger på',
    highlight: 'vaskemaskinen din.',
    tagline: `Ca. ${formatKr(CLEANER_PAYOUT_PER_LOAD_ORE)} per vask. Vi henter og leverer.`,
  });
}
