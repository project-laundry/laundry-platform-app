import { MapPin } from "lucide-react";

export function ServiceAreas() {
  const areas = [
    {
      name: "Bergen",
      status: "Tilgjengelig nå",
    },
    {
      name: "Oslo",
      status: "Tilgjengelig nå",
    },
  ];

  return (
    <section id="områder" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-sm font-medium text-[hsl(var(--sea-green))] uppercase tracking-widest">
            SERVICEOMRÅDER
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light">
            Vi leverer i{" "}
            <span className="text-gradient font-medium">Bergen og Oslo</span>
          </h2>
          <p className="text-lg md:text-xl text-foreground/70">
            Starter i Norges to største byer
          </p>
        </div>

        {/* Area Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {areas.map((area, index) => (
            <div
              key={area.name}
              className="bg-white border-2 border-border rounded-2xl p-10 text-center hover:border-[hsl(var(--nordic-blue))] hover:shadow-card transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--cream))] flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-[hsl(var(--nordic-blue))]" />
              </div>

              {/* Area Name */}
              <h3 className="text-3xl font-semibold text-foreground mb-2">
                {area.name}
              </h3>

              {/* Status */}
              <p className="text-lg text-[hsl(var(--sea-green))] font-medium">
                {area.status}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
