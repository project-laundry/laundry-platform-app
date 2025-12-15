import { Clock, Leaf, ShieldCheck, Heart, Award, BadgeCheck } from "lucide-react";

export function Benefits() {
  const benefits = [
    {
      icon: Clock,
      title: "Spar tid",
      description:
        "Få tilbake verdifull tid til familie, hobbyer og det du elsker mest.",
    },
    {
      icon: Leaf,
      title: "Miljøvennlig",
      description:
        "Vi bruker kun miljøvennlige og allergivennlige vaskemidler som er trygge for hele familien.",
    },
    {
      icon: ShieldCheck,
      title: "Trygg håndtering",
      description:
        "Klærne dine håndteres med største omhu og profesjonalitet fra start til slutt.",
    },
    {
      icon: Heart,
      title: "Personlig service",
      description:
        "Vi bryr oss om hver kunde og gir deg den servicen du fortjener.",
    },
    {
      icon: Award,
      title: "Profesjonell finish",
      description:
        "Perfekt vasket, strøket og brettet med høyeste standard hver gang.",
    },
    {
      icon: BadgeCheck,
      title: "Kvalitetsgaranti",
      description:
        "Ikke fornøyd? Vi ordner det. Din tilfredshet er vår prioritet.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-sm font-medium text-[hsl(var(--sea-green))] uppercase tracking-widest">
            FORDELENE
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light">
            Hvorfor velge{" "}
            <span className="text-gradient font-medium">oss?</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
            Nordisk luksus med høyeste standard
          </p>
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
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--cream))] group-hover:bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center mb-6 transition-colors">
                  <Icon className="w-6 h-6 text-[hsl(var(--nordic-blue))]" />
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
