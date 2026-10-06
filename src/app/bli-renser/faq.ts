import { PRICING, CLEANER_MIN_PAYOUT_PER_ORDER_ORE, formatKr } from '@/lib/config/pricing';

/** Cleaner FAQ, shared by the coming-soon page (a subset) and the full
 *  landing page so the answers can't drift. Keys let pages pick entries. */
export const CLEANER_FAQ = {
  where: {
    q: 'Hvor kan jeg være renser?',
    a: 'Foreløpig i Bergen og Oslo. Postnummeret ditt må ligge i et av områdene våre.',
  },
  needs: {
    q: 'Hva trenger jeg?',
    a: 'En egen vaskemaskin hjemme og en adresse i Bergen eller Oslo som sjåføren kan levere til og hente fra. Du trenger ikke bil.',
  },
  driving: {
    q: 'Må jeg hente eller levere tøy?',
    a: 'Nei. Sjåføren vår tar all henting og levering. Du vasker hjemme.',
  },
  earnings: {
    q: 'Hvor mye tjener jeg?',
    a: `Du får ${PRICING.cleaner_payout_percent} % av totalprisen på hvert oppdrag. Minste bestilling er ${formatKr(PRICING.minimum_order_ore)}, så du tjener minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag – og mer når kunden sender flere vask. En vask er én full maskin, inntil 5 kg.`,
  },
  turnaround: {
    q: 'Hvor raskt må tøyet være klart?',
    a: 'Kunden får en estimert leveringsdato når tøyet hentes. Marker oppdraget som klart så snart tøyet er tørt og brettet, så henter sjåføren det på neste rute. Jo raskere du er ferdig, jo fornøydere kunde.',
  },
  damage: {
    q: 'Hva om noe skjer med et plagg?',
    a: 'Følg vaskesymbolene og beskjedene kunden har lagt ved, så er du på trygg grunn. Skulle noe likevel gå galt, melder kunden fra til NooraCare, og vi håndterer reklamasjonen sammen med deg – du står aldri alene med kunden.',
  },
  payment: {
    q: 'Hvordan får jeg betalt?',
    a: 'Kunden betaler med Vipps når du markerer oppdraget som klart. Din andel utbetales til kontonummeret du oppgir ved registrering.',
  },
  approval: {
    q: 'Hvordan blir jeg godkjent?',
    a: 'Vi går gjennom søknaden din innen 1–2 virkedager. Du ser statusen i dashbordet ditt så snart den er behandlet.',
  },
} as const;

export type CleanerFaqKey = keyof typeof CLEANER_FAQ;

export function pickFaq(keys: CleanerFaqKey[]) {
  return keys.map((key) => CLEANER_FAQ[key]);
}
