'use client';

import { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import {
  EVALUATION_TEXT_MAX,
  SATISFACTION_QUESTION,
  evaluationQuestions,
  type EvaluationQuestion,
} from '@/lib/config/evaluation';
import { submitEvaluationAction } from './actions';

type Answers = Record<string, number | string>;

const card =
  'rounded-3xl border bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur transition-colors';
const chipBase = 'rounded-xl border font-medium transition-all active:scale-[0.98]';
const chipOn = 'border-sea-green bg-sea-green/10 text-sea-green';
const chipOff = 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50';

/** Shown instead of the form after a successful submit, and by the page when the order is already answered. */
export function EvaluationThanks({ text }: { text: string }) {
  return (
    <div className={`${card} border-cream-dark/80 text-center animate-in fade-in slide-in-from-bottom-3 duration-500`}>
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
        <Check className="size-7" />
      </span>
      <h2 className="mt-4 font-serif text-2xl font-semibold text-dark-gray">Tusen takk</h2>
      <p className="mt-2 text-medium-gray">{text}</p>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: EvaluationQuestion;
  value: number | string | undefined;
  onChange: (value: number | string) => void;
}) {
  const labelId = `q-${question.id}`;

  if (question.type === 'scale') {
    const steps = Array.from({ length: question.to - question.from + 1 }, (_, i) => question.from + i);
    return (
      <>
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className={`grid gap-2 ${steps.length > 5 ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5'}`}
        >
          {steps.map((step) => (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={value === step}
              onClick={() => onChange(step)}
              className={`${chipBase} py-3 text-center tabular-nums ${value === step ? chipOn : chipOff}`}
            >
              {step}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm text-medium-gray">
          <span>{question.lowLabel}</span>
          <span>{question.highLabel}</span>
        </div>
      </>
    );
  }

  if (question.type === 'choice') {
    return (
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`${chipBase} px-4 py-3 ${value === option.value ? chipOn : chipOff}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'price') {
    const chosen = typeof value === 'number';
    // The slider starts at the left edge so it does not suggest a price; the
    // answer only counts once the customer has touched it.
    const pick = (raw: string) => onChange(Number(raw));
    return (
      <>
        <p
          className={
            chosen
              ? 'font-serif text-2xl font-semibold tabular-nums text-dark-gray'
              : 'text-sm text-medium-gray'
          }
          aria-live="polite"
        >
          {chosen ? `${value}${value === question.max ? '+' : ''} kr` : 'Dra for å velge'}
        </p>
        <input
          type="range"
          aria-labelledby={labelId}
          aria-valuetext={chosen ? `${value} kr` : 'Ikke valgt'}
          min={question.min}
          max={question.max}
          step={question.step}
          value={chosen ? value : question.min}
          onChange={(event) => pick(event.target.value)}
          onPointerUp={(event) => pick(event.currentTarget.value)}
          onKeyUp={(event) => pick(event.currentTarget.value)}
          className={`mt-3 h-8 w-full cursor-pointer accent-sea-green ${chosen ? '' : 'opacity-60'}`}
        />
        <div className="flex justify-between text-sm tabular-nums text-medium-gray">
          <span>{question.min} kr</span>
          <span>{question.max}+ kr</span>
        </div>
      </>
    );
  }

  return (
    <textarea
      id={labelId}
      rows={3}
      maxLength={EVALUATION_TEXT_MAX}
      placeholder={question.placeholder}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
    />
  );
}

export function EvaluationForm({
  orderId,
  full,
  initialSatisfaction,
}: {
  orderId: string;
  full: boolean;
  /** The score pressed in the evaluation e-mail, or null. Selected from the start; the customer can change it. */
  initialSatisfaction: number | null;
}) {
  const questions = evaluationQuestions(full);
  const [answers, setAnswers] = useState<Answers>(() =>
    initialSatisfaction === null ? {} : { [SATISFACTION_QUESTION.id]: initialSatisfaction }
  );
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return <EvaluationThanks text="Svaret ditt er sendt. Det hjelper oss masse." />;
  }

  const setAnswer = (id: string, value: number | string) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setMissing((current) => current.filter((item) => item !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;

    const unanswered = questions
      .filter((q) => q.type !== 'text')
      .map((q) => q.id)
      .filter((id) => answers[id] === undefined);
    if (unanswered.length > 0) {
      setMissing(unanswered);
      setError(
        unanswered.length === 1
          ? 'Svar på spørsmålet som er markert før du sender.'
          : `Svar på de ${unanswered.length} spørsmålene som er markert før du sender.`
      );
      document.getElementById(`card-${unanswered[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setError(null);
    setSending(true);
    try {
      const result = await submitEvaluationAction(orderId, answers);
      if (result.success) {
        setSent(true);
        window.scrollTo({ top: 0 });
      } else {
        setError(result.error);
      }
    } catch {
      setError('Svaret ble ikke sendt. Sjekk nettforbindelsen og prøv igjen.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {questions.map((question, index) => (
        <div
          key={question.id}
          id={`card-${question.id}`}
          className={`${card} ${missing.includes(question.id) ? 'border-red-300' : 'border-cream-dark/80'}`}
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sm font-semibold tabular-nums text-sea-green">
              {index + 1}
            </span>
            <div>
              {question.type === 'text' ? (
                <label htmlFor={`q-${question.id}`} className="font-medium text-dark-gray">
                  {question.label} <span className="font-normal text-medium-gray">(valgfritt)</span>
                </label>
              ) : (
                <p id={`q-${question.id}`} className="font-medium text-dark-gray">
                  {question.label}
                </p>
              )}
              {question.hint && <p className="mt-1 text-sm text-medium-gray">{question.hint}</p>}
            </div>
          </div>
          <QuestionInput
            question={question}
            value={answers[question.id]}
            onChange={(value) => setAnswer(question.id, value)}
          />
        </div>
      ))}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {sending ? 'Sender …' : 'Send svar'}
      </button>
      <p className="text-center text-sm text-medium-gray">Svarene brukes bare til å forbedre NooraCare.</p>
    </form>
  );
}
