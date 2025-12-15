import { Clock, Leaf, ShieldCheck, Heart, Award, BadgeCheck } from "lucide-react";

export function Benefits() {
  const benefits = [
    {
      icon: Clock,
      title: "Spar verdifull tid",
    description: "Bruk timene på familie, hobbyer eller bare avslapning.",
    },
    {
      icon: Leaf,
      title: "Miljøvennlig",
      description:
        "Vi bruker kun miljøvennlige og allergivennlige vaskemidler.",
    },
    {
      icon: ShieldCheck,
      title: "Trygg behandling",
    description: "Dine plagg håndteres med største forsiktighet og respekt.",
    },
    {
      icon: Heart,
      title: "Personlig service",
    description: "Tilpasset dine preferanser og behov, hver eneste gang.",
    },
    {
      icon: Award,
      title: "Profesjonell finish",
    description: "Strøket, brettet og pakket – klar til bruk.",
    },
    {
      icon: BadgeCheck,
      title: "Kvalitetsgaranti",
      description:
        "Ikke fornøyd? Vi ordner det. Din tilfredshet er vår prioritet.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-aurora">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-16 md:mb-20">
          <span className="text-sm font-medium text-sea-green uppercase tracking-widest mb-4 block">
            Hvorfor velge Noora
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
            For travle hverdager,
            <br />
            <span className="text-gradient font-medium">med et snev av luksus</span>
          </h2>
        </div>

        {/* Benefits Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card transition-all duration-300 animate-fade-in group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-cream group-hover:bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center mb-6 transition-colors">
                  <Icon className="w-6 h-6 text-nordic-blue" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {benefit.title}
                </h3>
                <p className="text-foreground/70 leading-relaxed">
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
