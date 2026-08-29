import { Calendar, ShoppingBag, Sparkles, Truck } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: Calendar,
    title: "Bestill henting",
    description:
      "Velg et tidspunkt som passer deg direkte i kalenderen. Du mottar en bekreftelse på e-post.",
    step: 1,
  },
  {
    icon: ShoppingBag,
    title: "Sett ut tøyet",
    description:
      "Plasser klærne i en pose utenfor døren. Ingen sortering nødvendig – vi håndterer alt.",
    step: 2,
  },
  {
    icon: Sparkles,
    title: "Proff behandling",
    description:
      "Vi vasker, tørker og stryker med profesjonell omhu. Faktura sendes digitalt når tøyet er klart.",
    step: 3,
  },
  {
    icon: Truck,
    title: "Rent på døren",
    description:
      "Klærne leveres ferdig brettet og klare til bruk innen 48 timer.",
    step: 4,
  },
];

export function HowItWorks() {
  return (
    <section id="slik-virker-det" className="border-t border-cream-dark/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-24">
          <span className="mb-4 block text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Slik virker det
          </span>
          <h2 className="mb-6 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Enkelt. Elegant. Effektivt.
          </h2>
          <p className="text-lg text-medium-gray">
            Fire enkle steg til en renere hverdag
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="h-full rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8 animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Step badge */}
              <span className="mb-4 inline-flex items-center rounded-full bg-sea-green/10 px-2.5 py-0.5 text-xs font-medium text-sea-green">
                Steg {step.step}
              </span>

              {/* Icon */}
              <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <step.icon className="size-5" />
              </div>

              {/* Content */}
              <h3 className="mb-3 font-serif text-xl font-semibold text-dark-gray">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-medium-gray md:text-base">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mt-12 flex justify-center md:mt-16">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-7 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Bestill nå
          </Link>
        </div>
      </div>
    </section>
  );
}
