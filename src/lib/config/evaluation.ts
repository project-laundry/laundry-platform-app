// The customer evaluation form (/evaluering/<order id>): the questions, the
// validation of a submitted answer set and the formatting the admin page uses.
// Pure — no I/O. Answers are stored as one JSON object keyed by question id in
// order_evaluations.answers, together with EVALUATION_FORM_VERSION.
//
// Changing a question: edit it here and bump EVALUATION_FORM_VERSION. Never
// reuse an id for a different question — old rows keep their old meaning.

export const EVALUATION_FORM_VERSION = '2026-11';

/** Longest free-text answer we store. */
export const EVALUATION_TEXT_MAX = 2000;

interface QuestionBase {
  /** Key in order_evaluations.answers. */
  id: string;
  /** The question as the customer reads it. */
  label: string;
  /** Short name for the admin page. */
  short: string;
  hint?: string;
}

export interface ScaleQuestion extends QuestionBase {
  type: 'scale';
  from: number;
  to: number;
  lowLabel: string;
  highLabel: string;
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'choice';
  options: { value: string; label: string }[];
}

/** A price in whole kroner picked on a slider. `max` means "max or more". */
export interface PriceQuestion extends QuestionBase {
  type: 'price';
  min: number;
  max: number;
  step: number;
}

/** Free text, always optional. */
export interface TextQuestion extends QuestionBase {
  type: 'text';
  placeholder: string;
}

export type EvaluationQuestion = ScaleQuestion | ChoiceQuestion | PriceQuestion | TextQuestion;

export type EvaluationAnswer = number | string | null;
export type EvaluationAnswers = Record<string, EvaluationAnswer>;

const PRICE_RANGE = { min: 50, max: 400, step: 10 } as const;

export const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  {
    id: 'satisfaction',
    type: 'scale',
    label: 'Hvor fornøyd er du med vasken totalt?',
    short: 'Fornøyd totalt',
    from: 1,
    to: 5,
    lowLabel: 'Lite fornøyd',
    highLabel: 'Veldig fornøyd',
  },
  {
    id: 'on_time',
    type: 'choice',
    label: 'Kom tøyet tilbake innen avtalt tid?',
    short: 'Tilbake i tide',
    options: [
      { value: 'yes', label: 'Ja' },
      { value: 'no', label: 'Nei' },
    ],
  },
  {
    id: 'quality',
    type: 'choice',
    label: 'Var tøyet rent og brettet slik du forventet?',
    short: 'Rent og brettet',
    options: [
      { value: 'yes', label: 'Ja' },
      { value: 'partly', label: 'Delvis' },
      { value: 'no', label: 'Nei' },
    ],
  },
  {
    id: 'ease_of_ordering',
    type: 'scale',
    label: 'Hvor enkelt var det å bestille?',
    short: 'Enkelt å bestille',
    from: 1,
    to: 5,
    lowLabel: 'Vanskelig',
    highLabel: 'Veldig enkelt',
  },
  {
    id: 'fair_price_bag',
    type: 'price',
    label: 'Hva synes du er en rimelig pris for én pose med klær?',
    short: 'Rimelig pris per pose',
    hint: 'En pose er omtrent en bærepose. Dra prikken langs linja.',
    ...PRICE_RANGE,
  },
  {
    id: 'too_expensive_bag',
    type: 'price',
    label: 'Ved hvilken pris per pose ville det blitt for dyrt for deg?',
    short: 'For dyrt per pose',
    ...PRICE_RANGE,
  },
  {
    id: 'fair_price_bedding',
    type: 'price',
    label: 'Hva er en rimelig pris for vask av ett sett sengetøy?',
    short: 'Rimelig pris sengetøy',
    hint: 'Dynetrekk, putetrekk og laken.',
    ...PRICE_RANGE,
  },
  {
    id: 'frequency',
    type: 'choice',
    label: 'Hvor ofte ville du brukt NooraCare?',
    short: 'Hvor ofte',
    options: [
      { value: 'weekly', label: 'Hver uke' },
      { value: 'biweekly', label: 'Annenhver uke' },
      { value: 'monthly', label: 'En gang i måneden' },
      { value: 'rarely', label: 'Sjeldnere' },
      { value: 'never', label: 'Ikke igjen' },
    ],
  },
  {
    id: 'subscription_interest',
    type: 'choice',
    label: 'Ville du vurdert et abonnement med fast henting og lavere pris per pose?',
    short: 'Abonnement',
    options: [
      { value: 'yes', label: 'Ja' },
      { value: 'maybe', label: 'Kanskje' },
      { value: 'no', label: 'Nei' },
    ],
  },
  {
    id: 'recommend',
    type: 'scale',
    label: 'Hvor sannsynlig er det at du anbefaler NooraCare til en venn?',
    short: 'Anbefaler',
    from: 0,
    to: 10,
    lowLabel: 'Ikke sannsynlig',
    highLabel: 'Svært sannsynlig',
  },
  {
    id: 'improvements',
    type: 'text',
    label: 'Hva kan vi gjøre bedre?',
    short: 'Kan bli bedre',
    placeholder: 'Alt fra henting og vask til bestilling og kommunikasjon',
  },
  {
    id: 'other',
    type: 'text',
    label: 'Noe annet du vil si til oss?',
    short: 'Annet',
    placeholder: 'Ros, ris eller en idé',
  },
];

/** Ids of the questions that must be answered (everything except free text). */
export const REQUIRED_EVALUATION_IDS = EVALUATION_QUESTIONS.filter((q) => q.type !== 'text').map((q) => q.id);

function validAnswer(question: EvaluationQuestion, value: unknown): EvaluationAnswer | undefined {
  switch (question.type) {
    case 'scale':
      return typeof value === 'number' && Number.isInteger(value) && value >= question.from && value <= question.to
        ? value
        : undefined;
    case 'price':
      return typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= question.min &&
        value <= question.max &&
        (value - question.min) % question.step === 0
        ? value
        : undefined;
    case 'choice':
      return typeof value === 'string' && question.options.some((option) => option.value === value)
        ? value
        : undefined;
    case 'text': {
      if (value === undefined || value === null) return null;
      if (typeof value !== 'string') return undefined;
      const text = value.trim();
      if (text.length > EVALUATION_TEXT_MAX) return undefined;
      return text === '' ? null : text;
    }
  }
}

/**
 * Checks a submitted answer set against the questions. Returns a clean object
 * with exactly one key per question (unknown keys are dropped, empty text is
 * null), or null when a required answer is missing or any value is invalid.
 */
export function validateEvaluationAnswers(input: unknown): EvaluationAnswers | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;

  const answers: EvaluationAnswers = {};
  for (const question of EVALUATION_QUESTIONS) {
    const answer = validAnswer(question, raw[question.id]);
    if (answer === undefined) return null;
    answers[question.id] = answer;
  }
  return answers;
}

/** An answer as text for the admin page; «—» when there is none. */
export function formatEvaluationAnswer(question: EvaluationQuestion, value: EvaluationAnswer | undefined): string {
  if (value === null || value === undefined) return '—';
  switch (question.type) {
    case 'scale':
      return `${value} av ${question.to}`;
    case 'price':
      return value === question.max ? `${value} kr eller mer` : `${value} kr`;
    case 'choice':
      return question.options.find((option) => option.value === value)?.label ?? String(value);
    case 'text':
      return String(value);
  }
}

/** Mean of the numeric answers to one question, or null when nobody answered it. */
export function averageEvaluationAnswer(answerSets: EvaluationAnswers[], questionId: string): number | null {
  const values = answerSets
    .map((answers) => answers[questionId])
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Path of the form for one order. */
export function evaluationPath(orderId: string): string {
  return `/evaluering/${orderId}`;
}
