import { Clock, Users, Wallet } from "lucide-react";
import { PRICING, formatKr } from "@/lib/config/pricing";

export function Benefits() {
  // Only what a vetted neighbor washing at home can actually deliver.
  const benefits = [
    {
      icon: Clock,
      title: "Spar verdifull tid",
      description: "Bruk timene på familie, hobbyer eller bare avslapning.",
    },
    {
      icon: Users,
      title: "En lokal renser du kan stole på",
      description:
        "Tøyet vaskes av en godkjent renser i området ditt – ikke et anonymt vaskeri.",
    },
    {
      icon: Wallet,
      title: "Enkel pris, enkel betaling",
      description: `Fra ${formatKr(PRICING.per_bag_ore)} per pose. Du betaler med Vipps når tøyet er ferdig vasket. Ingen binding.`,
    },
  ];

  return (
    <section className="border-t border-cream-dark/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center md:mb-20">
          <span className="mb-4 block text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Hvorfor velge NooraCare
          </span>
          <h2 className="mb-6 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            For travle hverdager,
            <br />
            med hjelp fra naboen
          </h2>
        </div>

        {/* Benefits Grid */}
        <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Icon */}
                <div className="mb-6 flex size-11 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Icon className="size-5" />
                </div>

                {/* Content */}
                <h3 className="mb-3 font-serif text-xl font-semibold text-dark-gray">
                  {benefit.title}
                </h3>
                <p className="leading-relaxed text-medium-gray">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
