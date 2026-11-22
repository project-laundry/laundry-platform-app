'use server';

import { EVALUATION_FORM_VERSION, evaluationQuestions, validateEvaluationAnswers } from '@/lib/config/evaluation';
import { createEvaluation, getOrderForEvaluation, needsFullEvaluation } from '@/lib/database/evaluations';
import { reportError } from '@/lib/services/error-alerts';
import { clientIp, isRateLimited } from '@/lib/utils/rate-limit';

export type SubmitEvaluationResult = { success: true } | { success: false; error: string };

/**
 * Stores the evaluation of one completed order. Public (no login): the order
 * id in the link is the key, so the action is rate limited per IP and accepts
 * exactly one answer set per order. A second submit is a success without a write.
 */
export async function submitEvaluationAction(orderId: string, input: unknown): Promise<SubmitEvaluationResult> {
  try {
    if (await isRateLimited('evaluation', await clientIp())) {
      return { success: false, error: 'For mange forsøk. Prøv igjen om noen minutter.' };
    }

    const order = typeof orderId === 'string' ? await getOrderForEvaluation(orderId) : null;
    if (!order || order.status !== 'completed') {
      return { success: false, error: 'Vi fant ikke bestillingen.' };
    }

    // Which form applies is decided here, never by the client.
    const full = await needsFullEvaluation(order.customer_id);
    const answers = validateEvaluationAnswers(input, evaluationQuestions(full));
    if (!answers) {
      return { success: false, error: 'Svar på alle spørsmålene før du sender.' };
    }

    const result = await createEvaluation({
      order_id: order.id,
      customer_id: order.customer_id,
      form_version: EVALUATION_FORM_VERSION,
      answers,
    });
    if (result === 'error') {
      return { success: false, error: 'Svaret ble ikke lagret. Prøv igjen.' };
    }
    return { success: true };
  } catch (error) {
    await reportError('Evaluering ble ikke lagret', error, { order: String(orderId) });
    return { success: false, error: 'Svaret ble ikke lagret. Prøv igjen.' };
  }
}
