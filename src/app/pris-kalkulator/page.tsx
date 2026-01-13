import { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PriceCalculator } from "@/components/pricing-calculator/PriceCalculator";

export const metadata: Metadata = {
  title: "Priskalkulator | NooraCare",
  description:
    "Beregn prisen for din klesvask med vår interaktive priskalkulator. Se alle priser for vask, stryking og levering.",
};

export default function PrisKalkulatorPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16 bg-aurora min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-4">
              Beregn din <span className="text-gradient">vaskepris</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Bruk vår kalkulator for å estimere hva din klesvask vil koste.
              Velg antall vask og eventuell stryking.
            </p>
          </div>

          {/* Calculator */}
          <PriceCalculator />
        </div>
      </main>
      <Footer />
    </div>
  );
}
