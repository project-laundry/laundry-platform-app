import type { Metadata } from "next";
import { MarketingNav } from '@/components/landing/MarketingNav';
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { ServiceAreas } from "@/components/landing/ServiceAreas";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

// The real landing page, parked here while "/" shows the coming-soon page.
// Move it back to src/app/page.tsx at launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Home() {
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
      <MarketingNav />
      <Hero />
      <HowItWorks />
      <Benefits />
      <ServiceAreas />
      <CTA />
      <Footer />
    </div>
  );
}
