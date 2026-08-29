import { Star } from "lucide-react";

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
    <section className="border-t border-cream-dark/60 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl space-y-4 text-center">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Det kundene våre sier
          </span>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Ren tilfredshet
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="flex h-full flex-col rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Rating */}
              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4 fill-sea-green text-sea-green"
                  />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="mb-6 flex-1 leading-relaxed text-dark-gray">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* Avatar with Initials */}
                <div className="flex size-11 items-center justify-center rounded-full bg-nordic-blue/10">
                  <span className="text-sm font-semibold text-nordic-blue">
                    {testimonial.initials}
                  </span>
                </div>

                {/* Name and Location */}
                <div>
                  <div className="font-semibold text-dark-gray">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-medium-gray">
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
