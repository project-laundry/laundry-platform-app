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
    <section id="slik-virker-det" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="px-4">
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center mb-16 md:mb-24">
          <span className="text-sm font-medium text-sea-green uppercase tracking-widest mb-4 block">
            Slik virker det
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
            Enkelt. Elegant.{" "}
            <span className="text-gradient font-medium">Effektivt.</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Fire enkle steg til en renere hverdag
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative group"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector line - visible on lg screens between cards */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-[60%] w-[calc(100%-20%)] h-px">
                  <div className="w-full h-full bg-gradient-to-r from-primary/30 via-sea-green/20 to-transparent" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sea-green/30" />
                </div>
              )}

              <div className="relative bg-cream rounded-2xl p-6 md:p-8 shadow-card hover:shadow-glow transition-all duration-500 group-hover:-translate-y-1 h-full">
                {/* Step badge */}
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-4">
                  Steg {step.step}
                </span>

                {/* Icon */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-linear-to-br from-primary to-sea-green flex items-center justify-center mb-5 shadow-soft group-hover:shadow-glow transition-all duration-500">
                  <step.icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="font-serif text-xl md:text-2xl font-medium text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-12 md:mt-16">
          <Link
            href="/orders/services"
            className="inline-flex items-center justify-center px-8 py-4 bg-linear-to-r from-primary to-sea-green text-primary-foreground font-medium rounded-full shadow-soft hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5"
          >
            Bestill nå
          </Link>
        </div>
      </div>
    </section>
  );
}
