import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og-image';
import { CLEANER_MIN_PAYOUT_PER_ORDER_ORE, formatKr } from '@/lib/config/pricing';

export const alt = 'Bli renser hos NooraCare – tjen penger på vaskemaskinen din.';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'Tjen penger på',
    highlight: 'vaskemaskinen din.',
    tagline: `Minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag. Vi henter og leverer.`,
  });
}
