import type { Metadata } from 'next';
import { ComingSoonHero, ComingSoonShell, CrossPromo } from '@/components/coming-soon/ComingSoonShell';
import { HowItWorksStory } from '@/components/coming-soon/HowItWorksStory';
import { LAUNCH_WINDOW_LABEL, WAITLIST_OFFER_SPOTS } from '@/components/coming-soon/launch';
import { CLEANER_MIN_PAYOUT_PER_ORDER_ORE, formatKr } from '@/lib/config/pricing';
import { getWaitlistCount } from '@/lib/database/waitlist';

// Pre-launch landing page. The full landing page is parked at /lansering;
// at launch, move src/app/lansering/page.tsx back here.
// The description comes from the root layout.
export const metadata: Metadata = {
  title: 'NooraCare – Slipp klesvasken. En nabo tar den.',
};

// Re-read the signup counter every 5 minutes.
export const revalidate = 300;

export default async function ComingSoonPage() {
  const count = await getWaitlistCount('customer');

  return (
    <ComingSoonShell audience="customer" switchHref="/bli-renser" switchLabel="Bli renser">
      <ComingSoonHero
        audience="customer"
        badge={`Åpner i Bergen og Oslo ${LAUNCH_WINDOW_LABEL}`}
        title="Snart slipper du"
        highlight="klesvasken."
        subtitle="En godkjent renser i området vasker tøyet ditt. Vi henter og leverer hjem til deg. Sett deg på listen, så får du beskjed først."
        offer={{ title: 'Halv pris på første vask', detail: `for de ${WAITLIST_OFFER_SPOTS} første på listen` }}
        count={count}
        image={{
          src: '/images/hero-hallway.jpg',
          alt: 'En kvinne setter en gul klespose fra seg ved ytterdøren, med brettet tøy på en benk',
          position: '85% 50%',
        }}
      />

      <HowItWorksStory />

      <CrossPromo
        text={`Har du vaskemaskin? Tjen minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag på å vaske for naboene.`}
        href="/bli-renser"
        cta="Bli renser"
      />
    </ComingSoonShell>
  );
}
