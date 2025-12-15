import { Calendar, Truck, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Calendar,
    title: "Bestill henting",
    description: "Velg et tidspunkt som passer deg. Vi henter klærne dine rett fra døren din.",
    step: "01",
  },
  {
    icon: Sparkles,
    title: "Vi vasker og stryker",
    description: "Dine klær behandles med omhu – vasket, tørket og strøket med profesjonell presisjon.",
    step: "02",
  },
  {
    icon: Truck,
    title: "Levert hjem til deg",
    description: "Ferdigpakkede og rene klær leveres tilbake innen 48 timer.",
    step: "03",
  },
];

export function HowItWorks() {

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="px-4">
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center mb-16 md:mb-24">
          <span className="text-sm font-medium text-sea-green uppercase tracking-widest mb-4 block">
            Slik fungerer det
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
            Enkelt. Elegant. <span className="text-gradient font-medium">Effektivt.</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Tre enkle steg til en renere hverdag
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative group"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-full h-px bg-gradient-to-r from-border to-transparent" />
              )}

              <div className="relative bg-cream rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-500 group-hover:-translate-y-1">
                {/* Step number */}
                <span className="absolute -top-4 -right-2 font-serif text-6xl font-light text-muted/50">
                  {step.step}
                </span>

                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-primary to-sea-green flex items-center justify-center mb-6 shadow-soft group-hover:shadow-glow transition-all duration-500">
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="font-serif text-2xl font-medium text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
