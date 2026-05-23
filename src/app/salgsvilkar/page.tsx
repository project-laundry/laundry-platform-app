import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Salgsvilkår | NooraCare",
  description:
    "Salgsvilkår for NooraCare – peer-to-peer vasketjeneste i Bergen og Oslo. Les om priser, betaling, levering, angrerett, abonnement og reklamasjon.",
};

export default function SalgsvilkarPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16 bg-aurora min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <header className="text-center mb-12">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-4">
                Salgsvilkår
              </h1>
              <p className="text-sm text-muted-foreground">
                Sist oppdatert: 23.05.2026
              </p>
            </header>

            {/* Intro */}
            <section className="mb-10">
              <p className="text-base text-foreground/80 leading-relaxed">
                Disse salgsvilkårene gjelder mellom NooraCare og deg som kunde
                ved bruk av tjenestene våre via{" "}
                <Link
                  href="/"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  nooracare.no
                </Link>
                . Ved å bestille en tjeneste eller inngå et abonnement
                aksepterer du vilkårene som er beskrevet her.
              </p>
            </section>

            {/* 1. Parties */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                1. Om avtalen og partene
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Selger og avtalemotpart er NooraCare. Kjøper er den
                myndige privatpersonen som registrerer seg og bestiller
                tjenester via plattformen. Selve vaskeoppdraget utføres av
                lokale, selvstendige rensere som er tilknyttet NooraCare.
                NooraCare er ansvarlig for selve avtaleforholdet,
                betalingsformidling og kundeforholdet.
              </p>
              <div className="bg-white/60 rounded-2xl p-6 shadow-soft border border-foreground/5">
                <p className="text-sm text-foreground/70 mb-3 font-medium">
                  Kontakt- og selskapsinformasjon:
                </p>
                <ul className="space-y-1.5 text-sm text-foreground/80">
                  <li>
                    <span className="font-medium">Selskapsnavn:</span> NooraCare
                    AS
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

            {/* 2. Service description */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                2. Tjenestebeskrivelse
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                NooraCare formidler henting, vask, eventuell stryking og
                levering av klesvask i Bergen og Oslo. Tjenesten kan benyttes på
                to måter:
              </p>
              <ul className="space-y-3 text-base text-foreground/80 leading-relaxed list-disc list-outside pl-6">
                <li>
                  <span className="font-medium">Abonnement</span> – fast,
                  gjentakende henting med valgt frekvens. Betaling skjer via
                  Vipps.
                </li>
                <li>
                  <span className="font-medium">Enkeltbestilling</span> –
                  engangsoppdrag uten bindende abonnement. Betaling skjer via
                  Vipps.
                </li>
              </ul>
              <p className="text-base text-foreground/80 leading-relaxed mt-4">
                Tjenesten leveres innenfor de geografiske områdene Bergen og
                Oslo. NooraCare kan avvise bestillinger som faller utenfor
                serviceområdet eller som ikke kan utføres med rimelig innsats.
              </p>
            </section>

            {/* 3. Prices */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                3. Priser
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Gjeldende priser vises i{" "}
                <Link
                  href="/pris-kalkulator"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  priskalkulatoren
                </Link>{" "}
                og i bestillingsflyten. Alle priser er oppgitt i norske kroner.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                NooraCare bruker fleksibel prising: estimat vises ved
                bestilling, men endelig pris fastsettes av renseren etter
                henting basert på faktisk vekt og tilleggstjenester (for
                eksempel stryking eller spesialvask).
              </p>
            </section>

            {/* 4. Order placement */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                4. Bestilling og avtaleinngåelse
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                Bestilling skjer ved å fullføre bestillingsflyten på
                nettstedet. Bindende avtale anses inngått når du har godkjent
                betaling i Vipps og NooraCare har bekreftet bestillingen ved
                å sende bekreftelse til den e-postadressen du oppga ved
                registrering.
              </p>
            </section>

            {/* 5. Payment */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                5. Betaling
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Betaling skjer via Vipps. For abonnement opprettes en Vipps
                Recurring-avtale som gir NooraCare rett til å belaste deg per
                gjennomførte oppdrag. Belastningen reserveres når renseren har
                fastsatt endelig pris, og trekkes deretter fra Vipps.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                For enkeltbestillinger skjer betaling via Vipps ePayment ved
                fullført bestilling. NooraCare lagrer ikke kortinformasjon –
                betalingsopplysninger håndteres av Vipps i henhold til deres
                vilkår.
              </p>
            </section>

            {/* 6. Pickup & delivery */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                6. Henting og levering
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Henting skjer på avtalt dato innenfor det hentevinduet som
                vises i bestillingsbekreftelsen. Vasket og eventuelt stryket
                tøy leveres tilbake til samme adresse innenfor avtalt
                leveringsvindu.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                Du er ansvarlig for å være tilgjengelig på adressen i avtalte
                tidsrom, eller for å gi tydelige instruksjoner for
                kontaktløs henting/levering. Hvis henting eller levering ikke
                kan gjennomføres på grunn av forhold på din side, kan
                NooraCare belaste et bomturgebyr som angitt i prislisten.
              </p>
            </section>

            {/* 7. Subscription terms */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                7. Abonnement: bindingstid, endring og oppsigelse
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Abonnementet løper fra første henting og fortsetter med valgt
                frekvens inntil det sies opp. Det er ingen bindingstid utover
                det inneværende oppdraget – du kan når som helst pause eller
                avslutte abonnementet ditt.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Endringer (frekvens, adresse, hentedag, spesielle
                instruksjoner) og oppsigelse gjøres via dashbordet ditt på{" "}
                <Link
                  href="/dashboard"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  nooracare.no/dashboard
                </Link>
                , eller ved å kontakte oss på{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  support@nooracare.no
                </a>
                . Endringer trer i kraft fra og med neste planlagte henting,
                forutsatt at de er registrert senest 24 timer før hentingen.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                Når abonnementet sies opp, stoppes Vipps-avtalen og ingen
                ytterligere oppdrag genereres. Eventuelle oppdrag som allerede
                er bekreftet og under utførelse fullføres og faktureres på
                vanlig måte.
              </p>
            </section>

            {/* 8. Right of withdrawal */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                8. Angrerett
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                I henhold til angrerettloven har du som forbruker rett til å
                gå fra avtalen innen 14 dager fra avtaleinngåelsen, uten å
                oppgi grunn. Angreretten utøves ved å gi NooraCare en utvetydig
                melding på{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  support@nooracare.no
                </a>
                . Standard angrerettskjema fra Forbrukertilsynet kan også
                brukes.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                Hvis du har bedt om at tjenesten påbegynnes innenfor
                angrefristen, og tjenesten er fullført med ditt samtykke, faller
                angreretten bort for den utførte tjenesten i samsvar med
                angrerettloven § 22 bokstav c. Er tjenesten kun delvis utført,
                skal du betale et beløp som står i forhold til det som er
                utført.
              </p>
            </section>

            {/* 9. Complaints */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                9. Reklamasjon og mangler
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Hvis tjenesten har en mangel – for eksempel skadet eller
                manglende tøy etter levering – må du melde fra til NooraCare
                innen rimelig tid etter at du oppdaget eller burde ha oppdaget
                mangelen, og senest innen de fristene som følger av
                forbrukerkjøpsloven og håndverkertjenesteloven.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                Reklamasjon sendes til{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  support@nooracare.no
                </a>{" "}
                med ordrenummer og beskrivelse av forholdet. Vedlegg gjerne
                bilder. Vi tar kontakt så snart som mulig for å avklare
                retting, prisavslag, ny utførelse eller erstatning.
              </p>
            </section>

            {/* 10. Liability */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                10. Ansvar
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                NooraCare og våre rensere behandler tøyet ditt etter beste
                faglige skjønn og i tråd med vaskesymboler og instruksjoner du
                har gitt. Du er selv ansvarlig for å oppgi spesielle hensyn
                (for eksempel ømtålige plagg, fjerning av gjenstander fra
                lommer eller plagg som ikke tåler standard vask) før henting.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                NooraCare er ikke ansvarlig for skader som skyldes feil
                eller mangelfulle vaskesymboler, allerede eksisterende slitasje
                eller skade på plagget, eller forhold du har unnlatt å opplyse
                om. Vårt ansvar for dokumenterte skader er for øvrig begrenset
                til erstatning av plaggets verdi etter alminnelige norske
                forbrukerregler.
              </p>
            </section>

            {/* 11. Privacy */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                11. Personvern
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                NooraCare behandler personopplysninger i samsvar med
                personopplysningsloven og GDPR. Hvilke opplysninger vi
                behandler, hvorfor og hvordan, beskrives nærmere i vår
                personvernerklæring. Spørsmål om personvern kan rettes til{" "}
                <a
                  href="mailto:support@nooracare.no"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  support@nooracare.no
                </a>
                .
              </p>
            </section>

            {/* 12. Disputes */}
            <section className="mb-10">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                12. Tvisteløsning
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed mb-4">
                Vi oppfordrer deg alltid til å ta kontakt med oss først hvis
                noe ikke er som det skal være – de aller fleste saker løses
                raskt direkte mellom kunde og NooraCare.
              </p>
              <p className="text-base text-foreground/80 leading-relaxed">
                Dersom vi ikke blir enige, kan saken bringes inn for
                Forbrukertilsynet og Forbrukerklageutvalget. Forbrukere
                bosatt i andre EU/EØS-land kan også benytte EU-kommisjonens
                klageportal på{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[hsl(var(--nordic-blue))] underline underline-offset-4 hover:opacity-80"
                >
                  ec.europa.eu/consumers/odr
                </a>
                . Tvister er underlagt norsk rett med verneting i Bergen
                tingrett, med mindre annet følger av ufravikelig lovgivning.
              </p>
            </section>

            {/* 13. Changes */}
            <section className="mb-4">
              <h2 className="font-serif text-2xl md:text-3xl font-light text-foreground mb-4">
                13. Endringer i vilkårene
              </h2>
              <p className="text-base text-foreground/80 leading-relaxed">
                NooraCare kan oppdatere disse salgsvilkårene. Vesentlige
                endringer som påvirker eksisterende kunder varsles på e-post
                eller i dashbordet i rimelig tid før de trer i kraft. Den
                til enhver tid gjeldende versjonen ligger på denne siden, med
                oppdatert dato øverst.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
