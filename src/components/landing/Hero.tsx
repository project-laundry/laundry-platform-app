import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";

// Every claim here must hold for a neighbor washing in a home machine —
// no turnaround promises (delivery dates are estimates), no "free delivery".
const TRUST_POINTS = [
  "Henting og levering på døren",
  "Betal med Vipps etterpå",
  "Ingen binding",
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cream-dark/80 bg-warm-white/80 px-4 py-2 shadow-soft backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
              <Sparkles className="size-4 text-sea-green" />
              <span className="text-sm font-medium text-medium-gray">
                En nabo vasker. Vi henter og leverer.
              </span>
            </div>

            {/* Headline */}
            <h1
              className="mt-8 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl lg:text-6xl animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "60ms" }}
            >
              Slipp klesvasken.
              <br />
              En nabo tar den.
            </h1>

            {/* Explainer text */}
            <p
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-medium-gray md:text-xl lg:mx-0 animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "120ms" }}
            >
              En godkjent renser i området vasker, tørker og bretter tøyet
              ditt. Vi henter posene på døren og leverer dem rene tilbake.
            </p>

            {/* CTAs */}
            <div
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start animate-in fade-in slide-in-from-bottom-3 duration-500 justify-center"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-7 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Bestill klesvask
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#slik-virker-det"
                className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-7 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
              >
                Se hvordan det fungerer
              </Link>
            </div>

            {/* Trust indicators */}
            <div
              className="mt-14 flex flex-wrap justify-center gap-8 text-sm text-medium-gray lg:justify-start animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "240ms" }}
            >
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-sea-green" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div
            className="animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{ animationDelay: "120ms" }}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-cream-dark/80 shadow-[var(--shadow-card)]">
              <Image
                src="/images/clean-folded-clothing-and-garments-on-a-minimalist.png"
                alt="Rent, ferdig brettet tøy på et bord"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
