import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Personvernerklæring for rensere | NooraCare",
  description:
    "Personvernerklæring for rensere tilknyttet NooraCare. Forklarer behandling av identitets-, skatte- og kontoopplysninger, hvorfor de behandles og hvilke rettigheter du har etter GDPR.",
};

export default function PersonvernRenserPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16 bg-aurora min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <header className="text-center mb-12">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-4">
                Personvernerklæring for rensere
              </h1>
              <p className="text-sm text-muted-foreground">
                Sist oppdatert: 23.05.2026
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Denne erklæringen gjelder for personer som er tilknyttet
                NooraCare som rensere. Er du kunde, finner du{" "}
                <Link
                  href="/personvern"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  egen erklæring for kunder her
                </Link>
                .
              </p>
            </header>

            {/* Intro */}
            <section className="mb-10">
              <p className="text-base text-foreground/80 leading-relaxed">
                NooraCare AS behandler personopplysninger om deg når du
                registrerer deg, blir godkjent og utfører oppdrag som
                renser. Denne erklæringen forklarer hvilke opplysninger vi
                behandler – inkludert sensitive identifikatorer som
                fødselsnummer eller organisasjonsnummer og kontonummer –
                hvorfor vi behandler dem, hvor lenge vi oppbevarer dem,
                hvem vi deler dem med og hvilke rettigheter du har etter
                EUs personvernforordning (GDPR) og personopplysningsloven.
              </p>
            </section>

            {/* 1. Controller */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                1. Behandlingsansvarlig
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                NooraCare AS er behandlingsansvarlig for behandlingen av
                personopplysningene som beskrives her.
              </p>
              <div className="bg-white/60 rounded-2xl p-6 shadow-soft border border-foreground/5">
                <p className="text-sm text-foreground/70 mb-3 font-medium">
                  Kontaktopplysninger:
                </p>
                <ul className="space-y-1.5 text-sm text-foreground/80">
                  <li>
                    <span className="font-medium">Selskapsnavn:</span>{" "}
                    NooraCare AS
                  </li>
                  <li>
                    <span className="font-medium">Organisasjonsnummer:</span>{" "}
                    836 788 842
                  </li>
                  {/* TODO: replace with real postal address before production – keep in sync with Footer.tsx */}
                  <li>
                    <span className="font-medium">Postadresse:</span> Breimyra
                    232, 5134 Flaktveit
                  </li>
                  {/* TODO: replace with real phone number before production – keep in sync with Footer.tsx */}
                  <li>
                    <span className="font-medium">Telefon:</span>{" "}
                    <a
                      href="tel:+4797616468"
                      className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                    >
                      +47 976 16 468
                    </a>
                  </li>
                  <li>
                    <span className="font-medium">E-post:</span>{" "}
                    <a
                      href="mailto:support@nooracare.no"
                      className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                    >
                      support@nooracare.no
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. What we process */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                2. Hvilke personopplysninger vi behandler
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Vi behandler følgende kategorier opplysninger om deg som
                renser:
              </p>
              <ul className="space-y-3 text-base text-foreground/80 leading-relaxed list-disc list-outside pl-6 mb-4">
                <li>
                  <span className="font-medium">Identitet og kontakt:</span>{" "}
                  fullt navn, visningsnavn (det navnet kunder ser),
                  e-postadresse, telefonnummer, intern bruker-ID, tidspunkt
                  for siste innlogging.
                </li>
                <li>
                  <span className="font-medium">
                    Skatte- og betalingsidentifikatorer:
                  </span>{" "}
                  fødselsnummer (for privatpersoner) eller
                  organisasjonsnummer (for registrert virksomhet), og norsk
                  kontonummer for utbetaling. Dette er sensitive
                  identifikatorer som vi behandler under særlig strenge
                  vilkår, jf. personopplysningsloven § 12.
                </li>
                <li>
                  <span className="font-medium">Virksomhetsopplysninger:</span>{" "}
                  type virksomhet (privatperson eller registrert virksomhet),
                  firmanavn og forretningsadresse dersom du driver registrert
                  virksomhet.
                </li>
                <li>
                  <span className="font-medium">Operasjonell informasjon:</span>{" "}
                  baseadresse (gateadresse, postnummer, by, land) hvor du
                  driver virksomheten din fra, instruksjoner for adkomst,
                  ukentlig arbeidsplan, språk, spesialiseringer og
                  erfaringsnivå.
                </li>
                <li>
                  <span className="font-medium">Profilinformasjon:</span>{" "}
                  presentasjonstekst (bio) og eventuelt profilbilde dersom
                  du laster det opp.
                </li>
                <li>
                  <span className="font-medium">
                    Verifikasjons- og statusopplysninger:
                  </span>{" "}
                  verifikasjonsstatus (under behandling, godkjent, avvist,
                  suspendert), tidspunkt for godkjenning, eventuelt
                  tidspunkt for suspensjon og dokumentasjon vi har innhentet
                  i forbindelse med onboarding.
                </li>
                <li>
                  <span className="font-medium">Oppdragsdata:</span> oppdrag
                  du har akseptert eller fullført, beløp, prisnotater du
                  legger inn etter henting og statusoppdateringer på
                  ordrene.
                </li>
                <li>
                  <span className="font-medium">Kommunikasjon:</span> e-post
                  og meldinger du sender til support, og dokumentasjon
                  knyttet til reklamasjoner.
                </li>
              </ul>
              <p className="text-base text-foreground/80 leading-relaxed">
                Fødselsnummer benyttes kun der det er saklig behov for sikker
                identifisering eller fordi vi er pålagt det av
                myndighetene.
              </p>
            </section>

            {/* 3. Purpose & legal basis */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                3. Formål og rettslig grunnlag
              </h2>
              <ul className="space-y-3 text-base text-foreground/80 leading-relaxed list-disc list-outside pl-6">
                <li>
                  <span className="font-medium">
                    Inngå og oppfylle avtalen med deg som renser
                  </span>{" "}
                  – opprette og vedlikeholde profilen din, formidle
                  oppdrag, koordinere henting og levering. Rettslig
                  grunnlag: oppfyllelse av avtale (GDPR art. 6 nr. 1
                  bokstav b).
                </li>
                <li>
                  <span className="font-medium">Utbetale honorar</span> til
                  oppgitt kontonummer. Rettslig grunnlag: oppfyllelse av
                  avtale (art. 6 nr. 1 bokstav b).
                </li>
                <li>
                  <span className="font-medium">
                    Skatte- og avgiftsrapportering og regnskapsplikt
                  </span>{" "}
                  – behandling av fødselsnummer/organisasjonsnummer og
                  utbetalingsdata for å oppfylle skatteforvaltningsloven,
                  bokføringsloven og MVA-reglene. Rettslig grunnlag:
                  rettslig forpliktelse (art. 6 nr. 1 bokstav c). Bruken av
                  fødselsnummer er hjemlet i personopplysningsloven § 12.
                </li>
                <li>
                  <span className="font-medium">Verifikasjon og kvalitet</span>{" "}
                  – kontrollere at opplysningene du oppgir er korrekte,
                  godkjenne profiler og forebygge svindel. Rettslig
                  grunnlag: berettiget interesse (art. 6 nr. 1 bokstav f),
                  avveid mot dine personvernhensyn.
                </li>
                <li>
                  <span className="font-medium">Drift og support</span> –
                  håndtere henvendelser og feilsituasjoner. Rettslig
                  grunnlag: berettiget interesse (art. 6 nr. 1 bokstav f).
                </li>
              </ul>
            </section>

            {/* 4. Recipients */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                4. Hvem mottar opplysningene
              </h2>
              <ul className="space-y-3 text-base text-foreground/80 leading-relaxed list-disc list-outside pl-6 mb-4">
                <li>
                  <span className="font-medium">Supabase</span> – leverandør
                  av autentisering og databasehosting. Behandler profil-,
                  oppdrags- og verifikasjonsdata som databehandler under
                  databehandleravtale.
                </li>
                <li>
                  <span className="font-medium">
                    Skatte- og avgiftsmyndigheter
                  </span>{" "}
                  – mottar opplysninger om identitet, organisasjonsnummer
                  og inntekt slik norsk lov pålegger oss å rapportere.
                </li>
                <li>
                  <span className="font-medium">
                    Bank og betalingsformidler
                  </span>{" "}
                  – mottar kontonummer og utbetalingsbeløp for å
                  gjennomføre utbetaling av honorar.
                </li>
                <li>
                  <span className="font-medium">Vipps Mobilepay</span> – ved
                  behov for avstemming, refusjon eller utbetaling knyttet
                  til betalinger som er gjort via NooraCare-plattformen.
                </li>
                <li>
                  <span className="font-medium">Kunder</span> som du blir
                  tildelt oppdrag for ser kun visningsnavn, eventuelt
                  profilbilde og operasjonelt nødvendig informasjon for det
                  konkrete oppdraget. Fødselsnummer, kontonummer,
                  forretningsadresse, fullt navn og kontaktopplysninger
                  utleveres aldri til kunder.
                </li>
                <li>
                  <span className="font-medium">Offentlige myndigheter</span>{" "}
                  utover skatte- og avgiftsmyndigheter dersom vi er
                  rettslig forpliktet til å utlevere opplysninger.
                </li>
              </ul>
              <p className="text-base text-foreground/80 leading-relaxed">
                Vi selger aldri personopplysninger og deler dem ikke for
                markedsføringsformål.
              </p>
            </section>

            {/* 5. Cross-border transfers */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                5. Overføring til tredjeland
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                Personopplysningene dine behandles primært innenfor
                EU/EØS. Dersom en databehandler benytter infrastruktur
                utenfor EU/EØS, sikrer vi overføringen ved hjelp av
                EU-kommisjonens standard personvernbestemmelser (SCC) eller
                annen godkjent overføringsmekanisme. Eventuelle endringer
                vil framgå av denne erklæringen.
              </p>
            </section>

            {/* 6. Cookies */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                6. Informasjonskapsler
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                Vi bruker kun nødvendige informasjonskapsler for å holde
                deg innlogget og opprettholde sesjonen din. Disse settes
                av Supabase Auth og fornyes automatisk så lenge du er
                logget inn. Vi benytter ikke informasjonskapsler for
                analyse eller markedsføring.
              </p>
            </section>

            {/* 7. Retention */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                7. Lagringstid
              </h2>
              <ul className="space-y-3 text-base text-foreground/80 leading-relaxed list-disc list-outside pl-6">
                <li>
                  <span className="font-medium">Profil- og kontodata</span>{" "}
                  oppbevares så lenge du er tilknyttet NooraCare som renser.
                </li>
                <li>
                  <span className="font-medium">
                    Fødselsnummer og kontonummer
                  </span>{" "}
                  behandles strengt etter behov og oppbevares så lenge det
                  er nødvendig for å oppfylle utbetalings-, skatte- og
                  rapporteringsplikten. Etter at oppdragsforholdet er
                  avsluttet, slettes eller anonymiseres disse
                  opplysningene når lovpålagte oppbevaringsperioder er
                  utløpt.
                </li>
                <li>
                  <span className="font-medium">
                    Oppdrags-, utbetalings- og regnskapsdata
                  </span>{" "}
                  oppbevares i minst 5 år etter regnskapsårets slutt, slik
                  bokføringsloven krever.
                </li>
                <li>
                  <span className="font-medium">
                    Verifikasjons- og godkjenningshistorikk
                  </span>{" "}
                  oppbevares så lenge det er nødvendig for å dokumentere
                  beslutninger om godkjenning, avvisning eller suspensjon.
                </li>
                <li>
                  <span className="font-medium">
                    Ved sletting av profil
                  </span>{" "}
                  anonymiserer vi sensitive felter (fødselsnummer,
                  kontonummer, forretningsadresse, e-post, telefon og navn)
                  samtidig som vi beholder operasjonell historikk i
                  anonymisert form for å oppfylle lovpålagte krav.
                </li>
              </ul>
            </section>

            {/* 8. Security */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                8. Sikkerhet
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                Vi har innført tekniske og organisatoriske tiltak for å
                beskytte personopplysningene dine, blant annet kryptering
                under transport (HTTPS) og i hvile, tilgangsstyring på
                radnivå (Row Level Security) i databasen, særskilt
                begrenset tilgang til skatte- og kontonummer-felter, og
                begrenset tilgang for ansatte til det som er nødvendig for
                arbeidet deres. Ved et alvorlig sikkerhetsbrudd som utgjør
                en risiko for deg, varsler vi Datatilsynet og deg i
                samsvar med GDPR.
              </p>
            </section>

            {/* 9. Rights */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                9. Dine rettigheter
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Du har følgende rettigheter etter
                personvernforordningen:
              </p>
              <ul className="space-y-3 text-base text-foreground/80 leading-relaxed list-disc list-outside pl-6 mb-4">
                <li>Innsyn i opplysningene vi behandler om deg (art. 15).</li>
                <li>Retting av uriktige opplysninger (art. 16).</li>
                <li>
                  Sletting av opplysninger (art. 17), med mindre vi er
                  pålagt å oppbevare dem etter for eksempel
                  bokføringsloven eller skatteforvaltningsloven.
                </li>
                <li>Begrensning av behandlingen (art. 18).</li>
                <li>
                  Dataportabilitet for opplysninger du selv har gitt oss
                  (art. 20).
                </li>
                <li>
                  Innsigelse mot behandling som bygger på berettiget
                  interesse (art. 21).
                </li>
                <li>
                  Trekke tilbake samtykke der behandlingen bygger på det.
                </li>
              </ul>
              <p className="text-base text-foreground/80 leading-relaxed">
                For å utøve rettighetene dine kan du kontakte oss på{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  support@nooracare.no
                </a>
                . Vi besvarer henvendelsen din uten ugrunnet opphold og
                senest innen 30 dager.
              </p>
            </section>

            {/* 10. Right to complain */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                10. Klagerett
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                Hvis du mener vi behandler personopplysninger i strid med
                regelverket, kan du klage til Datatilsynet. Du finner
                kontaktinformasjon og veiledning på{" "}
                <a
                  href="https://www.datatilsynet.no"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  datatilsynet.no
                </a>
                . Vi setter likevel pris på om du tar kontakt med oss
                først, slik at vi kan rette opp eventuelle feil.
              </p>
            </section>

            {/* 11. Changes */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                11. Endringer i erklæringen
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                NooraCare kan oppdatere denne erklæringen ved endringer i
                tjenesten eller regelverket. Vesentlige endringer som
                påvirker deg vil bli varslet på e-post eller i dashbordet i
                rimelig tid før de trer i kraft. Den til enhver tid
                gjeldende versjonen ligger på denne siden, med oppdatert
                dato øverst.
              </p>
            </section>

            {/* 12. Contact */}
            <section className="mb-4">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                12. Kontakt oss
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                Spørsmål om personvern eller om denne erklæringen kan
                rettes til{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  support@nooracare.no
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
