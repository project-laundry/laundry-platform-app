import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";

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
                Nordisk kvalitet, levert hjem til deg
              </span>
            </div>

            {/* Headline */}
            <h1
              className="mt-8 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl lg:text-6xl animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "60ms" }}
            >
              Klesvask hentet
              <br />
              og levert hjem
            </h1>

            {/* Explainer text */}
            <p
              className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-medium-gray md:text-xl lg:mx-0 animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: "120ms" }}
            >
              Noora henter, vasker og leverer klærne dine – så du kan bruke
              tiden din på det som virkelig betyr noe.
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
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-sea-green" />
                <span>Gratis levering</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-sea-green" />
                <span>48t leveringstid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-sea-green" />
                <span>Miljøvennlig vask</span>
              </div>
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
                alt="Rent, sammenbrettet tøy på minimalistisk bord - profesjonell vaskeritjeneste"
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
