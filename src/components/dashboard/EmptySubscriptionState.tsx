import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function EmptySubscriptionState() {
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-12 text-center hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card transition-all duration-300 animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
      <div className="mb-8 flex flex-col items-center">
        {/* Gradient icon container */}
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center mb-8 shadow-soft">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="6" width="14" height="4" rx="1" strokeWidth="1.5" />
            <rect x="4" y="10" width="16" height="10" rx="2" strokeWidth="1.5" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>
        </div>

        <h3 className="font-serif text-3xl md:text-4xl font-light text-foreground mb-4">
          Bestill din <span className="text-gradient font-medium">første klesvask</span>
        </h3>
        <p className="text-muted-foreground text-lg max-w-md">
          Velg en plan som passer best for deg og la oss ta oss av klesvasken.
        </p>
      </div>
      <Link href="/orders/service">
        <Button
          variant="hero"
          size="xl"
          className="w-full max-w-sm"
        >
          Bestill klesvask
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
    </div>
  );
}
