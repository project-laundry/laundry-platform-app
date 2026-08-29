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
    <section id="områder" className="border-t border-cream-dark/60 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-5">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl space-y-4 text-center">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Serviceområder
          </span>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Vi leverer i Bergen og Oslo
          </h2>
          <p className="text-lg text-medium-gray md:text-xl">
            Starter i Norges to største byer
          </p>
        </div>

        {/* Area Cards */}
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {areas.map((area, index) => (
            <div
              key={area.name}
              className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-10 text-center shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Icon */}
              <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <MapPin className="size-6" />
              </div>

              {/* Area Name */}
              <h3 className="mb-3 font-serif text-3xl font-semibold text-dark-gray">
                {area.name}
              </h3>

              {/* Status */}
              <span className="inline-flex items-center rounded-full bg-sea-green/10 px-2.5 py-0.5 text-sm font-medium text-sea-green">
                {area.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
