import {
  PRICING,
  CLEANER_MIN_PAYOUT_PER_ORDER_ORE,
  CLEANER_PAYOUT_TERMS_TEXT,
  formatKr,
} from '@/lib/config/pricing';
import { PICKUP_TIME_RANGE } from '@/lib/config/pickup-times';

/** Cleaner FAQ, shared by the coming-soon page (a subset) and the full
 *  landing page so the answers can't drift. Keys let pages pick entries. */
export const CLEANER_FAQ = {
  where: {
    q: 'Hvor kan jeg være renser?',
    a: 'Foreløpig i Bergen og Oslo. Postnummeret ditt må ligge i et av områdene våre.',
  },
  needs: {
    q: 'Hva trenger jeg?',
    a: 'En egen vaskemaskin hjemme, en adresse i Bergen eller Oslo og mulighet til å hente og levere tøy hos kunder i byen din.',
  },
  driving: {
    q: 'Må jeg hente eller levere tøy?',
    a: `Ja. Du henter posene hos kunden på dagen kunden har valgt, mellom kl. ${PICKUP_TIME_RANGE.start} og ${PICKUP_TIME_RANGE.end}, og leverer det rene tøyet tilbake. Adressen, telefonnummeret og kundens beskjeder ser du i oppdraget.`,
  },
  noShow: {
    q: 'Hva om kunden ikke er hjemme?',
    a: 'Ring kunden fra oppdraget. Kunden kan flytte hentedagen selv i bestillingen sin. Avslå bare oppdraget hvis du ikke kan ta det.',
  },
  earnings: {
    q: 'Hvor mye tjener jeg?',
    a: `Du får ${PRICING.cleaner_payout_percent} % av totalprisen på hvert oppdrag. Minste bestilling er ${formatKr(PRICING.minimum_order_ore)}, så du tjener minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag – og mer når kunden sender flere vask. En vask er én full maskin, inntil 5 kg.`,
  },
  turnaround: {
    q: 'Hvor raskt må tøyet være klart?',
    a: 'Kunden får en estimert leveringsdato ved bestilling. Marker oppdraget som klart så snart tøyet er tørt og brettet, og lever det til kunden. Jo raskere du er ferdig, jo fornøydere kunde.',
  },
  damage: {
    q: 'Hva om noe skjer med et plagg?',
    a: 'Følg vaskesymbolene og beskjedene kunden har lagt ved, så er du på trygg grunn. Skulle noe likevel gå galt, melder kunden fra til NooraCare, og vi håndterer reklamasjonen sammen med deg – du står aldri alene med kunden.',
  },
  payment: {
    q: 'Hvordan får jeg betalt?',
    a: `Kunden betaler med Vipps når du markerer oppdraget som klart. ${CLEANER_PAYOUT_TERMS_TEXT} Hvert fullførte oppdrag og din andel av det ser du under Historikk i dashbordet ditt.`,
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
