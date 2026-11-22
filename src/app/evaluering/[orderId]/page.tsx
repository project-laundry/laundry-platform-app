import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { getOrderForEvaluation, hasEvaluation, needsFullEvaluation } from '@/lib/database/evaluations';
import { EvaluationForm, EvaluationThanks } from './EvaluationForm';

export const metadata: Metadata = {
  title: 'Hvordan var vasken? – NooraCare',
  robots: { index: false, follow: false },
};

// Reads the order and the answer state on every request.
export const dynamic = 'force-dynamic';

export default async function EvaluationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await getOrderForEvaluation(orderId);
  if (!order || order.status !== 'completed') {
    notFound();
  }

  const answered = await hasEvaluation(order.id);
  const full = answered === true ? false : await needsFullEvaluation(order.customer_id);

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

      <AppHeader
        right={<span className="text-sm tabular-nums text-medium-gray">Bestilling #{order.order_number}</span>}
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <header className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Evaluering</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">Hvordan var vasken?</h1>
          {answered !== true && (
            <p className="mt-3 text-medium-gray">
              {full
                ? 'Takk for at du bruker NooraCare. Svarene dine hjelper oss å sette riktig pris og gjøre tjenesten bedre. Det tar ca. 2 minutter.'
                : 'Takk for at du bruker NooraCare. Svarene dine hjelper oss å gjøre tjenesten bedre. Det tar under ett minutt.'}
            </p>
          )}
        </header>

        {answered === true ? (
          <EvaluationThanks text="Du har allerede svart på denne evalueringen." />
        ) : (
          <EvaluationForm orderId={order.id} full={full} />
        )}
      </main>
    </div>
  );
}
