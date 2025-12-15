import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pricing() {
  const plans = [
    {
      name: "Annenhver uke",
      price: "249",
      period: "NOK/mnd",
      description: "Vaskes annenhver uke",
      popular: false,
    },
    {
      name: "Ukentlig",
      price: "399",
      period: "NOK/mnd",
      description: "Vaskes hver uke",
      popular: true,
    },
    {
      name: "Enkeltvask",
      price: "149",
      period: "NOK",
      description: "Betal per vask",
      popular: false,
    },
  ];

  return (
    <section id="priser" className="py-24 md:py-32 bg-[hsl(var(--cream))]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-sm font-medium text-[hsl(var(--sea-green))] uppercase tracking-widest">
            PRISER
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light max-w-4xl mx-auto">
            For travle hverdager, med et snev av{" "}
            <span className="text-gradient font-medium">luksus</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/70">
            Velg planen som passer din familie
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-8 transition-all duration-300 animate-fade-in ${
                plan.popular
                  ? "border-2 border-[hsl(var(--nordic-blue))] shadow-glow"
                  : "border border-border hover:shadow-card"
              }`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] text-white px-6 py-1.5 rounded-full text-sm font-semibold shadow-soft">
                  Mest populær
                </div>
              )}

              {/* Plan Details */}
              <div className="space-y-6 pt-2">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-lg text-foreground/60 font-medium">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-foreground/70 mt-2">{plan.description}</p>
                </div>

                {/* CTA Button */}
                <Button
                  variant={plan.popular ? "hero" : "outline"}
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <Link href="/auth/signup">Velg plan</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
