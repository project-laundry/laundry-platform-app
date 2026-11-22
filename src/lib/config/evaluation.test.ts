import { describe, it, expect } from 'vitest';
import {
  EVALUATION_QUESTIONS,
  EVALUATION_TEXT_MAX,
  averageEvaluationAnswer,
  formatEvaluationAnswer,
  validateEvaluationAnswers,
} from './evaluation';

const VALID = {
  satisfaction: 4, on_time: 'yes', quality: 'partly', ease_of_ordering: 5,
  fair_price_bag: 250, too_expensive_bag: 400, fair_price_bedding: 150,
  frequency: 'biweekly', subscription_interest: 'maybe', recommend: 9,
  improvements: '  Raskere levering  ', other: '',
};

const question = (id: string) => EVALUATION_QUESTIONS.find((q) => q.id === id)!;

describe('validateEvaluationAnswers', () => {
  it('returns a clean answer set with all 12 keys', () => {
    const result = validateEvaluationAnswers({ ...VALID, extra: 'dropped' });

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
    const result = validateEvaluationAnswers(required);

    expect(result).not.toBeNull();
    expect(result!.improvements).toBeNull();
    expect(result!.other).toBeNull();
  });

  it('rejects a missing required answer', () => {
    const { satisfaction, ...rest } = VALID;
    void satisfaction;
    expect(validateEvaluationAnswers(rest)).toBeNull();
  });

  it('rejects scales out of range', () => {
    expect(validateEvaluationAnswers({ ...VALID, satisfaction: 6 })).toBeNull();
    expect(validateEvaluationAnswers({ ...VALID, recommend: 11 })).toBeNull();
  });

  it('rejects prices off-step or out of range', () => {
    expect(validateEvaluationAnswers({ ...VALID, fair_price_bag: 55 })).toBeNull();
    expect(validateEvaluationAnswers({ ...VALID, fair_price_bag: 410 })).toBeNull();
  });

  it('rejects an unknown choice value', () => {
    expect(validateEvaluationAnswers({ ...VALID, frequency: 'daily' })).toBeNull();
  });

  it('rejects text that is too long', () => {
    expect(validateEvaluationAnswers({ ...VALID, other: 'x'.repeat(EVALUATION_TEXT_MAX + 1) })).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(validateEvaluationAnswers(null)).toBeNull();
    expect(validateEvaluationAnswers('x')).toBeNull();
    expect(validateEvaluationAnswers([])).toBeNull();
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
