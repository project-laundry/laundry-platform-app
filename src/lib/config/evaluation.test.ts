import { describe, it, expect } from 'vitest';
import {
  EVALUATION_QUESTIONS,
  SATISFACTION_QUESTION,
  evaluationPath,
  prefilledSatisfaction,
  evaluationQuestions,
  hasAnsweredFirstTimeQuestions,
  EVALUATION_TEXT_MAX,
  averageEvaluationAnswer,
  formatEvaluationAnswer,
  validateEvaluationAnswers,
  cleanerRating,
  formatRating,
  isCleanerRatingShown,
} from './evaluation';

const VALID = {
  satisfaction: 4, on_time: 'yes', quality: 'partly', ease_of_ordering: 5,
  fair_price_bag: 250, too_expensive_bag: 400, fair_price_bedding: 150,
  frequency: 'biweekly', subscription_interest: 'maybe', recommend: 9,
  improvements: '  Raskere levering  ', other: '',
};

const FULL = evaluationQuestions(true);
const SHORT = evaluationQuestions(false);
const SHORT_KEYS = ['satisfaction', 'on_time', 'quality', 'improvements', 'other'];

const question = (id: string) => EVALUATION_QUESTIONS.find((q) => q.id === id)!;

describe('validateEvaluationAnswers', () => {
  it('returns a clean answer set with all 12 keys', () => {
    const result = validateEvaluationAnswers({ ...VALID, extra: 'dropped' }, FULL);

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toHaveLength(12);
    expect(result!.improvements).toBe('Raskere levering');
    expect(result!.other).toBeNull();
    expect(result).not.toHaveProperty('extra');
    expect(result!.satisfaction).toBe(4);
  });

  it('accepts missing text answers', () => {
    const { improvements, other, ...required } = VALID;
    void improvements;
    void other;
    const result = validateEvaluationAnswers(required, FULL);

    expect(result).not.toBeNull();
    expect(result!.improvements).toBeNull();
    expect(result!.other).toBeNull();
  });

  it('rejects a missing required answer', () => {
    const { satisfaction, ...rest } = VALID;
    void satisfaction;
    expect(validateEvaluationAnswers(rest, FULL)).toBeNull();
  });

  it('rejects scales out of range', () => {
    expect(validateEvaluationAnswers({ ...VALID, satisfaction: 6 }, FULL)).toBeNull();
    expect(validateEvaluationAnswers({ ...VALID, recommend: 11 }, FULL)).toBeNull();
  });

  it('rejects prices off-step or out of range', () => {
    expect(validateEvaluationAnswers({ ...VALID, fair_price_bag: 55 }, FULL)).toBeNull();
    expect(validateEvaluationAnswers({ ...VALID, fair_price_bag: 410 }, FULL)).toBeNull();
  });

  it('rejects an unknown choice value', () => {
    expect(validateEvaluationAnswers({ ...VALID, frequency: 'daily' }, FULL)).toBeNull();
  });

  it('rejects text that is too long', () => {
    expect(validateEvaluationAnswers({ ...VALID, other: 'x'.repeat(EVALUATION_TEXT_MAX + 1) }, FULL)).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(validateEvaluationAnswers(null, FULL)).toBeNull();
    expect(validateEvaluationAnswers('x', FULL)).toBeNull();
    expect(validateEvaluationAnswers([], FULL)).toBeNull();
  });
});

describe('short form', () => {
  it('has the five always-asked questions in order', () => {
    expect(SHORT.map((q) => q.id)).toEqual(SHORT_KEYS);
  });

  it('accepts a set with only the five keys and returns exactly five', () => {
    const short = Object.fromEntries(SHORT_KEYS.map((key) => [key, VALID[key as keyof typeof VALID]]));
    const result = validateEvaluationAnswers(short, SHORT);

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toEqual(SHORT_KEYS);
  });

  it('drops first-time keys that are sent anyway', () => {
    const result = validateEvaluationAnswers(VALID, SHORT);

    expect(Object.keys(result!)).toEqual(SHORT_KEYS);
  });

  it('is rejected by the full list when a first-time answer is missing', () => {
    const { recommend, ...rest } = VALID;
    void recommend;
    expect(validateEvaluationAnswers(rest, FULL)).toBeNull();
  });
});

describe('hasAnsweredFirstTimeQuestions', () => {
  it('is true when some set answers every first-time question', () => {
    expect(hasAnsweredFirstTimeQuestions([{ satisfaction: 3 }, { ...VALID }])).toBe(true);
  });

  it('is false for a short set, a partial set and no sets', () => {
    expect(hasAnsweredFirstTimeQuestions([{ satisfaction: 4, on_time: 'yes', quality: 'yes', improvements: null, other: null }])).toBe(false);
    expect(hasAnsweredFirstTimeQuestions([{ ...VALID, recommend: null }])).toBe(false);
    expect(hasAnsweredFirstTimeQuestions([])).toBe(false);
  });
});

describe('formatEvaluationAnswer', () => {
  it('formats each question type', () => {
    expect(formatEvaluationAnswer(question('satisfaction'), 4)).toBe('4 av 5');
    expect(formatEvaluationAnswer(question('fair_price_bag'), 400)).toBe('400 kr eller mer');
    expect(formatEvaluationAnswer(question('fair_price_bag'), 250)).toBe('250 kr');
    expect(formatEvaluationAnswer(question('quality'), 'partly')).toBe('Delvis');
    expect(formatEvaluationAnswer(question('other'), null)).toBe('—');
  });
});

describe('averageEvaluationAnswer', () => {
  it('averages the numbers and ignores sets without the key', () => {
    expect(averageEvaluationAnswer([{ satisfaction: 4 }, { satisfaction: 5 }, { other: 'x' }], 'satisfaction')).toBe(4.5);
  });

  it('is null when nobody answered', () => {
    expect(averageEvaluationAnswer([{ other: 'x' }], 'satisfaction')).toBeNull();
    expect(averageEvaluationAnswer([], 'satisfaction')).toBeNull();
  });
});

describe('the satisfaction question and its link', () => {
  it('is the first question of both forms', () => {
    expect(FULL[0]).toBe(SATISFACTION_QUESTION);
    expect(SHORT[0]).toBe(SATISFACTION_QUESTION);
  });

  it('builds the form path with and without a score', () => {
    expect(evaluationPath('ord-1')).toBe('/evaluering/ord-1');
    expect(evaluationPath('ord-1', 4)).toBe('/evaluering/ord-1?satisfaction=4');
  });

  it('reads a score on the scale from the query parameter', () => {
    expect(prefilledSatisfaction('1')).toBe(1);
    expect(prefilledSatisfaction('5')).toBe(5);
  });

  it('answers null for anything else', () => {
    for (const raw of [undefined, '', '0', '6', '4.5', '04', 'abc', '-1', ['4'], ['4', '5']]) {
      expect(prefilledSatisfaction(raw)).toBeNull();
    }
  });
});

describe('cleaner rating', () => {
  it('averages the satisfaction answers and counts only sets that have one', () => {
    expect(cleanerRating([{ satisfaction: 4 }, { satisfaction: 5 }, { other: 'x' }])).toEqual({ average: 4.5, count: 2 });
  });

  it('has no average without ratings', () => {
    expect(cleanerRating([])).toEqual({ average: null, count: 0 });
  });

  it('is shown to the cleaner from three ratings', () => {
    expect(isCleanerRatingShown({ average: null, count: 0 })).toBe(false);
    expect(isCleanerRatingShown({ average: 5, count: 2 })).toBe(false);
    expect(isCleanerRatingShown({ average: 4, count: 3 })).toBe(true);
  });

  it('formats with one decimal and a comma', () => {
    expect(formatRating(4.56)).toBe('4,6');
    expect(formatRating(5)).toBe('5,0');
  });
});
