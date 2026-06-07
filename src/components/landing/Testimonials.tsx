import { Star, Quote } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      name: "Kristine H.",
      location: "Bergen",
      initials: "KH",
      rating: 5,
      text: "Perfekt for travle familier med små barn. Jeg sparer så mye tid hver uke, og klærne kommer alltid tilbake rene og pent brettet. Anbefales på det sterkeste!",
    },
    {
      name: "Anders M.",
      location: "Oslo",
      initials: "AM",
      rating: 5,
      text: "Som singel med heltidsjobb har jeg ikke tid til å vaske. NooraCare har gjort hverdagen min så mye enklere. Glimrende service og alltid pålitelig levering.",
    },
    {
      name: "Maria L.",
      location: "Bergen",
      initials: "ML",
      rating: 5,
      text: "Fantastisk service fra start til slutt. De er alltid punktlige, klærne lukter friskt, og jeg setter stor pris på at de bruker allergivennlige produkter.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[hsl(var(--cream))]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-sm font-medium text-sea-green uppercase tracking-widest mb-4 block">
            Det kundene våre sier
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
            Ren <span className="text-gradient font-medium">tilfredshet</span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-card hover:shadow-glow hover:border hover:border-[hsl(var(--nordic-blue))]/30 transition-all duration-300 animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Decorative Quote Marks */}
              <div className="absolute -top-2 -left-2 opacity-5 pointer-events-none">
                <Quote className="w-32 h-32 text-[hsl(var(--nordic-blue))]" />
              </div>
              <div className="absolute -bottom-2 -right-2 opacity-5 pointer-events-none rotate-180">
                <Quote className="w-32 h-32 text-[hsl(var(--sea-green))]" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-[hsl(var(--sea-green))] text-[hsl(var(--sea-green))]"
                  />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-foreground/80 leading-relaxed mb-6 relative z-10">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* Avatar with Initials */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center shadow-soft">
                  <span className="text-white font-semibold text-sm">
                    {testimonial.initials}
                  </span>
                </div>

                {/* Name and Location */}
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-foreground/60">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
