import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/evaluations', () => ({
  getOrderForEvaluation: vi.fn(),
  createEvaluation: vi.fn(),
  needsFullEvaluation: vi.fn(),
}));
vi.mock('@/lib/utils/rate-limit', () => ({ isRateLimited: vi.fn(), clientIp: vi.fn() }));
vi.mock('@/lib/services/error-alerts', () => ({ reportError: vi.fn() }));

import { EVALUATION_FORM_VERSION } from '@/lib/config/evaluation';
import { createEvaluation, getOrderForEvaluation, needsFullEvaluation } from '@/lib/database/evaluations';
import { reportError } from '@/lib/services/error-alerts';
import { clientIp, isRateLimited } from '@/lib/utils/rate-limit';
import { submitEvaluationAction } from './actions';

const m = (fn: unknown) => fn as Mock;

const VALID = {
  satisfaction: 4, on_time: 'yes', quality: 'partly', ease_of_ordering: 5,
  fair_price_bag: 250, too_expensive_bag: 400, fair_price_bedding: 150,
  frequency: 'biweekly', subscription_interest: 'maybe', recommend: 9,
  improvements: '  Raskere levering  ', other: '',
};

const ORDER = { id: 'ord-1', customer_id: 'cust-1', status: 'completed', order_number: 'ABC123' };

beforeEach(() => {
  vi.clearAllMocks();
  m(clientIp).mockResolvedValue('1.2.3.4');
  m(isRateLimited).mockResolvedValue(false);
  m(getOrderForEvaluation).mockResolvedValue(ORDER);
  m(createEvaluation).mockResolvedValue('created');
  m(needsFullEvaluation).mockResolvedValue(true);
});

describe('submitEvaluationAction', () => {
  it('answers with an error and reads nothing when rate limited', async () => {
    m(isRateLimited).mockResolvedValue(true);

    const result = await submitEvaluationAction('ord-1', VALID);

    expect(result.success).toBe(false);
    expect(getOrderForEvaluation).not.toHaveBeenCalled();
    expect(createEvaluation).not.toHaveBeenCalled();
  });

  it('rejects invalid answers without inserting', async () => {
    const result = await submitEvaluationAction('ord-1', { ...VALID, satisfaction: 9 });

    expect(result.success).toBe(false);
    expect(createEvaluation).not.toHaveBeenCalled();
  });

  it('rejects an unknown order', async () => {
    m(getOrderForEvaluation).mockResolvedValue(null);

    const result = await submitEvaluationAction('ord-x', VALID);

    expect(result.success).toBe(false);
    expect(createEvaluation).not.toHaveBeenCalled();
  });

  it('rejects an order that is not completed', async () => {
    m(getOrderForEvaluation).mockResolvedValue({ ...ORDER, status: 'in_cleaning' });

    const result = await submitEvaluationAction('ord-1', VALID);

    expect(result.success).toBe(false);
    expect(createEvaluation).not.toHaveBeenCalled();
  });

  it('stores the cleaned answers for a completed order', async () => {
    const result = await submitEvaluationAction('ord-1', VALID);

    expect(result).toEqual({ success: true });
    expect(createEvaluation).toHaveBeenCalledWith({
      order_id: 'ord-1',
      customer_id: 'cust-1',
      form_version: EVALUATION_FORM_VERSION,
      answers: { ...VALID, improvements: 'Raskere levering', other: null },
    });
  });

  it('stores five answers when the customer gets the short form', async () => {
    m(needsFullEvaluation).mockResolvedValue(false);

    const result = await submitEvaluationAction('ord-1', VALID);

    expect(result).toEqual({ success: true });
    expect(needsFullEvaluation).toHaveBeenCalledWith('cust-1');
    const stored = m(createEvaluation).mock.calls[0][0].answers;
    expect(Object.keys(stored)).toEqual(['satisfaction', 'on_time', 'quality', 'improvements', 'other']);
  });

  it('rejects a short answer set when the full form applies', async () => {
    const short = { satisfaction: 4, on_time: 'yes', quality: 'yes', improvements: '', other: '' };

    const result = await submitEvaluationAction('ord-1', short);

    expect(result.success).toBe(false);
    expect(createEvaluation).not.toHaveBeenCalled();
  });

  it('treats a duplicate as success', async () => {
    m(createEvaluation).mockResolvedValue('duplicate');

    expect(await submitEvaluationAction('ord-1', VALID)).toEqual({ success: true });
  });

  it('answers with an error when the insert fails', async () => {
    m(createEvaluation).mockResolvedValue('error');

    const result = await submitEvaluationAction('ord-1', VALID);

    expect(result.success).toBe(false);
  });

  it('reports a thrown error and answers with an error', async () => {
    m(createEvaluation).mockRejectedValue(new Error('boom'));

    const result = await submitEvaluationAction('ord-1', VALID);

    expect(result.success).toBe(false);
    expect(reportError).toHaveBeenCalled();
  });
});
