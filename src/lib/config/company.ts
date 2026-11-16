// Legal entity and contact details shown in the footer, on /kontakt, on the
// legal pages (/salgsvilkar, /personvern, /personvern-renser) and on the
// cleaner-application success page. This is the ONLY place these values
// live — edit them here and every page follows.
//
// BEFORE LAUNCH (GitHub issue #33): confirm legalName and orgNumber against
// Brønnøysundregistrene, and phoneDisplay, address, email and the social
// URLs against the company's real details. Nothing else needs editing.

export const COMPANY = {
  /** Registered legal name, exactly as in Brønnøysundregistrene. */
  legalName: 'NooraCare AS',
  /** 9-digit organisasjonsnummer, digits only — formatOrgNumber() adds the spaces. */
  orgNumber: '836788842',
  /** Postal address. Rendered on one line by formatPostalAddress() and on two
   *  lines (street / postalCode city) in the footer and on /kontakt. */
  address: {
    street: 'Breimyra 232',
    postalCode: '5134',
    city: 'Flaktveit',
  },
  /** Phone number as displayed; phoneHref() derives the tel: link from it so
   *  the two can never disagree. */
  phoneDisplay: '+47 976 16 468',
  email: 'post@nooracare.no',
  instagramUrl: 'https://www.instagram.com/nooracare.no/',
  /** Facebook page URL, or null while there is none — the footer then shows
   *  no Facebook icon. */
  facebookUrl: null as string | null,
};

/** '836788842' → '836 788 842' (the grouping Brønnøysundregistrene uses). */
export function formatOrgNumber(orgNumber: string = COMPANY.orgNumber): string {
  return orgNumber.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/** tel: href for the displayed phone: '+47 976 16 468' → 'tel:+4797616468'. */
export function phoneHref(phoneDisplay: string = COMPANY.phoneDisplay): string {
  return `tel:${phoneDisplay.replace(/\s/g, '')}`;
}

/** One-line postal address: 'Breimyra 232, 5134 Flaktveit'. */
export function formatPostalAddress(address: typeof COMPANY.address = COMPANY.address): string {
  return `${address.street}, ${address.postalCode} ${address.city}`;
}
