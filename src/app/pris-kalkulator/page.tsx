import { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { EstimateCalculator } from "@/components/order-flow/EstimateCalculator";

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
              Velg hva du vil sende inn, så ser du med en gang omtrent hva det
              koster. Endelig pris settes etter henting.
            </p>
          </div>

          {/* Calculator */}
          <EstimateCalculator />
        </div>
      </main>
      <Footer />
    </div>
  );
}
