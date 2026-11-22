import Link from 'next/link';
import { AlertCircle, Inbox } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import {
  EVALUATION_QUESTIONS,
  averageEvaluationAnswer,
  formatEvaluationAnswer,
} from '@/lib/config/evaluation';
import { getAllEvaluations } from '@/lib/database/evaluations';

const card =
  'rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Oslo',
  });
}

function formatAverage(value: number): string {
  return value.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
}

export default async function AdminEvaluationsPage() {
  await requireRole(['admin']);
  const evaluations = await getAllEvaluations();

  const numericQuestions = EVALUATION_QUESTIONS.filter((q) => q.type === 'scale' || q.type === 'price');
  const answerSets = (evaluations ?? []).map((evaluation) => evaluation.answers);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">Evalueringer</h1>

      {evaluations === null ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>Kunne ikke hente evalueringene. Last siden på nytt.</p>
        </div>
      ) : evaluations.length === 0 ? (
        <div className={`${card} mt-4 flex flex-col items-center gap-2 px-5 py-10 text-center`}>
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen har svart ennå</p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-medium-gray">{evaluations.length} svar. Snitt per spørsmål:</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {numericQuestions.map((question) => {
              const average = averageEvaluationAnswer(answerSets, question.id);
              return (
                <div key={question.id} className={`${card} p-4`}>
                  <p className="text-sm text-medium-gray">{question.short}</p>
                  <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-dark-gray">
                    {average === null
                      ? '—'
                      : question.type === 'price'
                        ? `${formatAverage(average)} kr`
                        : `${formatAverage(average)} av ${question.to}`}
                  </p>
                </div>
              );
            })}
          </div>

          <ul className="mt-6 space-y-3">
            {evaluations.map((evaluation) => (
              <li key={evaluation.id} className={`${card} p-5`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-lg font-semibold text-dark-gray">
                    {evaluation.customer ? (
                      <Link href={`/admin/customers/${evaluation.customer.id}`} className="hover:underline">
                        {evaluation.customer.user.full_name}
                      </Link>
                    ) : (
                      'Ukjent kunde'
                    )}
                  </p>
                  <p className="text-sm text-medium-gray">
                    {evaluation.order && (
                      <>
                        <Link
                          href={`/admin/orders/${evaluation.order.id}`}
                          className="font-medium text-sea-green hover:underline"
                        >
                          #{evaluation.order.order_number}
                        </Link>{' '}
                        ·{' '}
                      </>
                    )}
                    {formatDate(evaluation.created_at)}
                  </p>
                </div>
                <dl className="mt-3 divide-y divide-cream-dark/60 text-sm">
                  {EVALUATION_QUESTIONS.filter((question) => question.id in evaluation.answers).map((question) => (
                    <div key={question.id} className="flex justify-between gap-4 py-2">
                      <dt className="shrink-0 text-medium-gray">{question.short}</dt>
                      <dd className="whitespace-pre-wrap text-right font-medium text-dark-gray">
                        {formatEvaluationAnswer(question, evaluation.answers[question.id])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
