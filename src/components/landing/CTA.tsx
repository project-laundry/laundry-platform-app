import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--nordic-blue))] via-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))]" />

      {/* Decorative Blurred Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Heading */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white leading-tight animate-fade-in">
            Klar for en{" "}
            <span className="font-medium">renere hverdag?</span>
          </h2>

          {/* Subheading with Promo */}
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Start i dag og få{" "}
            <span className="font-semibold">første vasken til halv pris</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Button
              variant="outline"
              size="xl"
              className="bg-white text-[hsl(var(--nordic-blue))] hover:bg-white/90 border-white"
              asChild
            >
              <Link href="/auth/signup">Start i dag</Link>
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="bg-transparent text-white border-2 border-white hover:bg-white/10"
              asChild
            >
              <Link href="/bli-renser">Bli en renser</Link>
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-sm text-white/70 pt-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            Ingen binding. Kanseller når som helst.
          </p>
        </div>
      </div>
    </section>
  );
}
