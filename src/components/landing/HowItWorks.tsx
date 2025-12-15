import { Package, Sparkles, Truck } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: 1,
      icon: Package,
      title: "Bestill klesvask",
      description:
        "Velg tid som passer din familie. Vi kommer og henter vasken hjemme hos deg.",
    },
    {
      number: 2,
      icon: Sparkles,
      title: "Profesjonell håndtering",
      description:
        "Klærne dine håndteres med høyeste standard og allergivennlige vaskemidler.",
    },
    {
      number: 3,
      icon: Truck,
      title: "Levert med omtanke",
      description:
        "Rene, friske klær levert direkte hjem til deg i løpet av 2-3 dager.",
    },
  ];

  return (
    <section
      id="slik-virker-det"
      className="py-24 md:py-32 bg-[hsl(var(--cream))]"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-sm font-medium text-[hsl(var(--sea-green))] uppercase tracking-widest">
            HVORDAN DET VIRKER
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light">
            Renhet. Omtanke.{" "}
            <span className="text-gradient font-medium">NooraCare.</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
            Klarhet og renhet i en travel hverdag
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative max-w-6xl mx-auto">
          {/* Connector Lines (desktop only) */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[hsl(var(--nordic-blue))] via-[hsl(var(--sea-green))] to-[hsl(var(--nordic-blue))] opacity-20" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-card hover:-translate-y-1 hover:shadow-glow transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Large Step Number (Background) */}
                <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
                  <span className="text-9xl font-serif font-light text-[hsl(var(--nordic-blue))]">
                    0{step.number}
                  </span>
                </div>

                {/* Step Number Badge */}
                <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center shadow-soft">
                  <span className="text-2xl font-serif font-semibold text-white">
                    {step.number}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-[hsl(var(--cream-dark))] flex items-center justify-center mb-6 mt-4">
                  <Icon className="w-7 h-7 text-[hsl(var(--nordic-blue))]" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-foreground/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
