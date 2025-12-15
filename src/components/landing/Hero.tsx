import Link from "next/link";
import { ChevronDown, Truck, Clock, Leaf, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-aurora">
      {/* Animated Decorative Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-accent/5 to-transparent rounded-full" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-soft mb-8 animate-fade-in opacity-0" style={{ animationDelay: "0.1s" }}>
            <Sparkles className="w-4 h-4 text-sea-green" />
            <span className="text-sm font-medium text-muted-foreground">Nordisk kvalitet, levert hjem til deg</span>
          </div>
          {/* Headline */}
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-6 animate-fade-in opacity-0" style={{ animationDelay: "0.2s" }}>
            <span className="text-foreground">Din hverdag,</span>
            <br />
            <span className="text-gradient font-medium">lysere og lettere</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in opacity-0" style={{ animationDelay: "0.4s" }}>
            Noora henter, vasker og leverer klærne dine – så du kan bruke tiden din på det som virkelig betyr noe.
            <span className="block mt-2 text-foreground font-medium">Renhet. Omtanke. Noora.</span>
          </p>

          {/* CTAs */}          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in opacity-0" style={{ animationDelay: "0.6s" }}>
            <Button variant="hero" size="xl">
              Bestill henting
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="hero-outline" size="lg">
              <Link href="#slik-virker-det">Se hvordan det fungerer</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground animate-fade-in opacity-0" style={{ animationDelay: "0.8s" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sea-green" />
              <span>Gratis levering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sea-green" />
              <span>48t leveringstid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sea-green" />
              <span>Miljøvennlig vask</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
        </div>
      </div>
    </section>
  );
}
