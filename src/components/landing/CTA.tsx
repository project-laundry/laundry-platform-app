import Link from "next/link";

export function CTA() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-5">
        <div className="rounded-3xl bg-nordic-blue px-6 py-16 text-center shadow-[var(--shadow-card)] sm:px-12 md:py-20 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="mx-auto max-w-3xl space-y-8">
            {/* Heading */}
            <h2 className="font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Klar for en renere hverdag?
            </h2>

            {/* Subheading with Promo */}
            <p className="mx-auto max-w-2xl text-xl text-white/90 md:text-2xl">
              Start i dag og få{" "}
              <span className="font-semibold">første vasken til halv pris</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-medium text-nordic-blue shadow-soft transition-all hover:brightness-95 active:scale-[0.98]"
              >
                Start i dag
              </Link>
              <Link
                href="/bli-renser"
                className="inline-flex items-center gap-2 rounded-full border border-white/60 px-7 py-3.5 font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                Bli en renser
              </Link>
            </div>

            {/* Disclaimer */}
            <p className="pt-2 text-sm text-white/70">
              Ingen binding. Kanseller når som helst.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
