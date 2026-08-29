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
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />
      <Navbar />
      <main className="pb-16 pt-28">
        <div className="mx-auto max-w-2xl px-5">
          {/* Header */}
          <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
              Priser
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
              Beregn din vaskepris
            </h1>
            <p className="mx-auto mt-3 max-w-md text-medium-gray">
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
