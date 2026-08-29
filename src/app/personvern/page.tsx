import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Personvernerklæring | NooraCare",
  description:
    "Personvernerklæring for NooraCare-kunder. Les om hvilke personopplysninger vi behandler, hvorfor, hvor lenge og hvilke rettigheter du har etter GDPR og personopplysningsloven.",
};

export default function PersonvernPage() {
  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-2xl px-5">
            {/* Header */}
            <header className="mb-12">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
                For kunder
              </p>
              <h1 className="mt-2 mb-4 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
                Personvernerklæring
              </h1>
              <p className="text-sm text-medium-gray">
                Sist oppdatert: 23.05.2026
              </p>
              <p className="text-sm text-medium-gray mt-2">
                Denne erklæringen gjelder for kunder. Er du tilknyttet
                NooraCare som renser, finner du{" "}
                <Link
                  href="/personvern-renser"
                  className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
                >
                  egen erklæring for rensere her
                </Link>
                .
              </p>
            </header>

            {/* Intro */}
            <section className="mb-10">
              <p className="leading-relaxed text-dark-gray">
                NooraCare AS behandler personopplysninger om deg når du
                bruker tjenestene våre. Denne erklæringen forklarer hvilke
                opplysninger vi samler inn, hvorfor, hvor lenge vi
                oppbevarer dem, hvem vi deler dem med og hvilke rettigheter
                du har etter EUs personvernforordning (GDPR) og
                personopplysningsloven.
              </p>
            </section>

            {/* 1. Controller */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                1. Behandlingsansvarlig
              </h2>
              <p className="leading-relaxed text-dark-gray mb-4">
                NooraCare AS er behandlingsansvarlig for behandlingen av
                personopplysningene som beskrives her.
              </p>
              <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
                <p className="mb-3 text-sm font-medium text-medium-gray">
                  Kontaktopplysninger:
                </p>
                <ul className="space-y-1.5 text-sm text-dark-gray">
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
                      className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
                    >
                      +47 976 16 468
                    </a>
                  </li>
                  <li>
                    <span className="font-medium">E-post:</span>{" "}
                    <a
                      href="mailto:support@nooracare.no"
                      className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
                    >
                      support@nooracare.no
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. What we process */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                2. Hvilke personopplysninger vi behandler
              </h2>
              <p className="leading-relaxed text-dark-gray mb-4">
                Vi behandler følgende kategorier opplysninger om deg som
                kunde:
              </p>
              <ul className="space-y-3 leading-relaxed text-dark-gray list-disc list-outside pl-6 mb-4">
                <li>
                  <span className="font-medium">Kontoopplysninger:</span> fullt
                  navn, e-postadresse, telefonnummer, intern bruker-ID,
                  tidspunkt for siste innlogging, opprettelses- og
                  oppdateringstidspunkt.
                </li>
                <li>
                  <span className="font-medium">Bestillingsopplysninger:</span>{" "}
                  henteadresse (gateadresse, postnummer, by, land),
                  spesielle instruksjoner for henting og levering, ønske om
                  stryking, planlagte hente- og leveringsdatoer, mengde
                  vask (for eksempel mørke/lyse vasker og strykedetaljer),
                  faktisk vekt og notater fra renseren.
                </li>
                <li>
                  <span className="font-medium">Betalingsopplysninger:</span>{" "}
                  beløp, status, referanse til Vipps-avtale eller
                  Vipps-transaksjon, samt metadata fra Vipps som er
                  nødvendige for å håndtere reservasjon, belastning,
                  tilbakebetaling og avstemming. NooraCare lagrer aldri
                  kortnummer eller annen sensitiv betalingsinformasjon –
                  dette håndteres av Vipps.
                </li>
                <li>
                  <span className="font-medium">Kommunikasjon:</span> e-post
                  og meldinger du sender til kundeservice, samt eventuelle
                  reklamasjoner og dokumentasjon knyttet til disse.
                </li>
              </ul>
              <p className="leading-relaxed text-dark-gray">
                Vi behandler ikke særlige kategorier av personopplysninger
                (for eksempel helseopplysninger) som del av tjenesten.
              </p>
            </section>

            {/* 3. Purpose & legal basis */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                3. Formål og rettslig grunnlag
              </h2>
              <ul className="space-y-3 leading-relaxed text-dark-gray list-disc list-outside pl-6">
                <li>
                  <span className="font-medium">
                    Levere tjenesten du har bestilt
                  </span>{" "}
                  – opprette konto, ta imot bestillinger, koordinere henting
                  og levering, håndtere abonnementer. Rettslig grunnlag:
                  oppfyllelse av avtale (GDPR art. 6 nr. 1 bokstav b).
                </li>
                <li>
                  <span className="font-medium">Behandle betalinger</span> via
                  Vipps. Rettslig grunnlag: oppfyllelse av avtale (art. 6 nr.
                  1 bokstav b).
                </li>
                <li>
                  <span className="font-medium">
                    Oppfylle lovpålagte krav
                  </span>{" "}
                  – herunder regnskapsplikt etter bokføringsloven (5 års
                  oppbevaringstid for transaksjonsdata). Rettslig grunnlag:
                  rettslig forpliktelse (art. 6 nr. 1 bokstav c).
                </li>
                <li>
                  <span className="font-medium">
                    Kundeservice, sikkerhet og forbedring av tjenesten
                  </span>{" "}
                  – svare på henvendelser, etterforske svindel og misbruk,
                  feilsøke teknikk. Rettslig grunnlag: berettiget interesse
                  (art. 6 nr. 1 bokstav f), avveid mot dine personvernhensyn.
                </li>
              </ul>
            </section>

            {/* 4. Recipients */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                4. Hvem mottar opplysningene
              </h2>
              <p className="leading-relaxed text-dark-gray mb-4">
                Vi deler opplysninger med følgende kategorier av mottakere:
              </p>
              <ul className="space-y-3 leading-relaxed text-dark-gray list-disc list-outside pl-6 mb-4">
                <li>
                  <span className="font-medium">Supabase</span> – leverandør
                  av autentisering og databasehosting. Behandler
                  kontoopplysninger, bestillingsdata og betalingsmetadata
                  som databehandler under databehandleravtale.
                </li>
                <li>
                  <span className="font-medium">Vipps Mobilepay</span> –
                  betalingsformidler. Mottar navn, e-post, telefonnummer,
                  ordrebeløp og en intern referanse for å opprette
                  betalingsavtale eller gjennomføre engangsbetaling. Vipps er
                  selv behandlingsansvarlig for sin egen behandling og
                  følger sin egen personvernerklæring.
                </li>
                <li>
                  <span className="font-medium">
                    Rensere tilknyttet plattformen
                  </span>{" "}
                  – får tilgang til navn, henteadresse og henteinstruksjoner
                  for det konkrete oppdraget de utfører for deg. Renserne er
                  selvstendige tjenesteytere og opptrer som databehandler
                  for NooraCare i den utstrekning de behandler dine
                  opplysninger på vegne av oss.
                </li>
                <li>
                  <span className="font-medium">Offentlige myndigheter</span>{" "}
                  – dersom vi er rettslig forpliktet til å utlevere
                  opplysninger.
                </li>
              </ul>
              <p className="leading-relaxed text-dark-gray">
                Vi selger aldri personopplysninger og deler dem ikke for
                markedsføringsformål.
              </p>
            </section>

            {/* 5. Cross-border transfers */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                5. Overføring til tredjeland
              </h2>
              <p className="leading-relaxed text-dark-gray">
                Personopplysningene dine behandles primært innenfor EU/EØS.
                Dersom en databehandler benytter infrastruktur utenfor
                EU/EØS, sikrer vi overføringen ved hjelp av EU-kommisjonens
                standard personvernbestemmelser (SCC) eller annen godkjent
                overføringsmekanisme. Eventuelle endringer vil framgå av
                denne erklæringen.
              </p>
            </section>

            {/* 6. Cookies */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                6. Informasjonskapsler
              </h2>
              <p className="leading-relaxed text-dark-gray">
                Vi bruker kun nødvendige informasjonskapsler for å holde
                deg innlogget og opprettholde sesjonen din. Disse settes av
                Supabase Auth og fornyes automatisk så lenge du er logget
                inn. Vi benytter ikke informasjonskapsler for analyse eller
                markedsføring.
              </p>
            </section>

            {/* 7. Retention */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                7. Lagringstid
              </h2>
              <ul className="space-y-3 leading-relaxed text-dark-gray list-disc list-outside pl-6">
                <li>
                  <span className="font-medium">Kontoopplysninger</span>{" "}
                  oppbevares så lenge du har en aktiv konto hos oss.
                </li>
                <li>
                  <span className="font-medium">
                    Bestillings- og betalingsdata
                  </span>{" "}
                  oppbevares i minst 5 år etter regnskapsårets slutt, slik
                  bokføringsloven krever.
                </li>
                <li>
                  <span className="font-medium">Ved sletting av konto</span>{" "}
                  anonymiserer vi e-post, telefonnummer og navn, samtidig
                  som vi beholder ordre- og betalingshistorikk i
                  anonymisert form for å oppfylle lovpålagte krav.
                </li>
              </ul>
            </section>

            {/* 8. Security */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                8. Sikkerhet
              </h2>
              <p className="leading-relaxed text-dark-gray">
                Vi har innført tekniske og organisatoriske tiltak for å
                beskytte personopplysningene dine, blant annet kryptering
                under transport (HTTPS) og i hvile, tilgangsstyring på
                radnivå (Row Level Security) i databasen, og begrenset
                tilgang for ansatte til det som er nødvendig for arbeidet
                deres. Ved et alvorlig sikkerhetsbrudd som utgjør en risiko
                for deg, varsler vi Datatilsynet og deg i samsvar med GDPR.
              </p>
            </section>

            {/* 9. Rights */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                9. Dine rettigheter
              </h2>
              <p className="leading-relaxed text-dark-gray mb-4">
                Du har følgende rettigheter etter personvernforordningen:
              </p>
              <ul className="space-y-3 leading-relaxed text-dark-gray list-disc list-outside pl-6 mb-4">
                <li>Innsyn i opplysningene vi behandler om deg (art. 15).</li>
                <li>Retting av uriktige opplysninger (art. 16).</li>
                <li>
                  Sletting av opplysninger (art. 17), med mindre vi er
                  pålagt å oppbevare dem for eksempel etter
                  bokføringsloven.
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
                <li>Trekke tilbake samtykke der behandlingen bygger på det.</li>
              </ul>
              <p className="leading-relaxed text-dark-gray">
                For å utøve rettighetene dine kan du kontakte oss på{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
                >
                  support@nooracare.no
                </a>
                . Vi besvarer henvendelsen din uten ugrunnet opphold og
                senest innen 30 dager.
              </p>
            </section>

            {/* 10. Right to complain */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                10. Klagerett
              </h2>
              <p className="leading-relaxed text-dark-gray">
                Hvis du mener vi behandler personopplysninger i strid med
                regelverket, kan du klage til Datatilsynet. Du finner
                kontaktinformasjon og veiledning på{" "}
                <a
                  href="https://www.datatilsynet.no"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
                >
                  datatilsynet.no
                </a>
                . Vi setter likevel pris på om du tar kontakt med oss
                først, slik at vi kan rette opp eventuelle feil.
              </p>
            </section>

            {/* 11. Changes */}
            <section className="mb-10">
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                11. Endringer i erklæringen
              </h2>
              <p className="leading-relaxed text-dark-gray">
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
              <h2 className="mb-4 font-serif text-2xl font-semibold text-dark-gray">
                12. Kontakt oss
              </h2>
              <p className="leading-relaxed text-dark-gray">
                Spørsmål om personvern eller om denne erklæringen kan
                rettes til{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-nordic-blue underline underline-offset-2 hover:text-nordic-blue-light"
                >
                  support@nooracare.no
                </a>
                .
              </p>
            </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
