import { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Kontakt | NooraCare",
  description:
    "Kontakt NooraCare – profesjonell henting og levering av klesvask i Bergen og Oslo. Firmaopplysninger, kontaktinformasjon og priser.",
};

export default function KontaktPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16 bg-aurora min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-4">
              Kontakt <span className="text-gradient">NooraCare</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Har du spørsmål om vask, henting eller levering? Vi hjelper deg
              gjerne.
            </p>
          </div>

          {/* Content */}
          <div className="max-w-3xl mx-auto grid gap-6 md:grid-cols-2">
            {/* Firmaopplysninger */}
            <section className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-5 h-5 text-foreground" />
                <h2 className="font-serif text-2xl text-foreground">
                  Firmaopplysninger
                </h2>
              </div>
              {/* TODO: replace with the legal entity name and 9-digit org number before production */}
              <dl className="space-y-3 text-foreground/80">
                <div>
                  <dt className="text-sm text-muted-foreground">Firmanavn</dt>
                  <dd className="font-medium">NooraCare AS</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Organisasjonsnummer
                  </dt>
                  <dd className="font-medium">836 788 842</dd>
                </div>
              </dl>
            </section>

            {/* Kontaktinformasjon */}
            <section className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-foreground" />
                <h2 className="font-serif text-2xl text-foreground">
                  Kontaktinformasjon
                </h2>
              </div>
              <ul className="space-y-4 text-foreground/80">
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-1 text-muted-foreground" />
                  <a
                    href="mailto:support@nooracare.no"
                    className="hover:text-foreground transition-colors"
                  >
                    support@nooracare.no
                  </a>
                </li>
                {/* TODO: replace with real phone number before production */}
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                  <a
                    href="tel:+4700000000"
                    className="hover:text-foreground transition-colors"
                  >
                    +47 976 16 468
                  </a>
                </li>
                {/* TODO: replace with real postal address before production */}
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <span>
                    Breimyra 232
                    <br />
                    5134 Flaktveit
                  </span>
                </li>
              </ul>
            </section>

            {/* Tjenester og priser */}
            <section className="bg-white rounded-2xl p-8 shadow-sm md:col-span-2">
              <h2 className="font-serif text-2xl text-foreground mb-3">
                Tjenester og priser
              </h2>
              <p className="text-foreground/80 leading-relaxed mb-4">
                NooraCare tilbyr henting og levering av klesvask, samt stryking,
                til privatkunder i Bergen og Oslo. Vi har faste priser per vask
                og per plagg for stryking.
              </p>
              <Link
                href="/pris-kalkulator"
                className="inline-flex items-center font-medium text-foreground hover:underline"
              >
                Se full prisliste →
              </Link>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
