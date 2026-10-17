import { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Building2, ArrowRight } from "lucide-react";
import { MarketingNav } from '@/components/landing/MarketingNav';
import { Footer } from "@/components/landing/Footer";
import { COMPANY, formatOrgNumber, phoneHref } from "@/lib/config/company";

export const metadata: Metadata = {
  title: "Kontakt | NooraCare",
  description:
    "Kontakt NooraCare – profesjonell henting og levering av klesvask i Bergen og Oslo. Firmaopplysninger, kontaktinformasjon og priser.",
};

export default function KontaktPage() {
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
      <MarketingNav />
      <main className="pb-16 pt-28">
        <div className="mx-auto max-w-3xl px-5">
          {/* Header */}
          <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
              Kontakt
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
              Kontakt NooraCare
            </h1>
            <p className="mx-auto mt-3 max-w-md text-medium-gray">
              Har du spørsmål om vask, henting eller levering? Vi hjelper deg
              gjerne.
            </p>
          </div>

          {/* Content */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Firmaopplysninger */}
            <section
              className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "60ms" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Building2 className="size-5" />
                </span>
                <h2 className="font-serif text-lg font-semibold text-dark-gray">
                  Firmaopplysninger
                </h2>
              </div>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-sm text-medium-gray">Firmanavn</dt>
                  <dd className="font-medium text-dark-gray">{COMPANY.legalName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-medium-gray">
                    Organisasjonsnummer
                  </dt>
                  <dd className="font-medium tabular-nums text-dark-gray">
                    {formatOrgNumber()}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Kontaktinformasjon */}
            <section
              className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Mail className="size-5" />
                </span>
                <h2 className="font-serif text-lg font-semibold text-dark-gray">
                  Kontaktinformasjon
                </h2>
              </div>
              <ul className="mt-4 space-y-4 text-dark-gray">
                <li className="flex items-start gap-3">
                  <Mail className="mt-1 size-4 text-sea-green" />
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="transition-colors hover:text-nordic-blue"
                  >
                    {COMPANY.email}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-1 size-4 text-sea-green" />
                  <a
                    href={phoneHref()}
                    className="transition-colors hover:text-nordic-blue"
                  >
                    {COMPANY.phoneDisplay}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 size-4 text-sea-green" />
                  <span>
                    {COMPANY.address.street}
                    <br />
                    {COMPANY.address.postalCode} {COMPANY.address.city}
                  </span>
                </li>
              </ul>
            </section>

            {/* Tjenester og priser */}
            <section
              className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur md:col-span-2 animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "180ms" }}
            >
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Tjenester og priser
              </h2>
              <p className="mt-3 leading-relaxed text-medium-gray">
                NooraCare tilbyr henting og levering av klesvask til
                privatkunder i Bergen og Oslo. Vi har faste priser per pose
                klær og per sett sengetøy.
              </p>
              <Link
                href="/pris-kalkulator"
                className="mt-4 inline-flex items-center gap-1.5 font-medium text-nordic-blue transition-colors hover:text-sea-green"
              >
                Se full prisliste
                <ArrowRight className="size-4" />
              </Link>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
