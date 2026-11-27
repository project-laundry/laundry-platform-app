// order_evaluations — the answers to the customer evaluation form. Service
// role only (the table has RLS with no policies): the form is public and keyed
// by the order's id, and the admin page is guarded by requireRole.

import { createAdminClient } from '@/lib/supabase/admin';
import {
  cleanerRating,
  hasAnsweredFirstTimeQuestions,
  type CleanerRating,
  type EvaluationAnswers,
} from '@/lib/config/evaluation';
import type { OrderEvaluation, OrderStatus } from '@/types/database';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EvaluationOrder {
  id: string;
  customer_id: string;
  status: OrderStatus;
  order_number: string;
}

/** The few order fields the evaluation form needs. Null for an unknown or malformed id. */
export async function getOrderForEvaluation(orderId: string): Promise<EvaluationOrder | null> {
  if (!UUID_PATTERN.test(orderId)) return null;

  const { data, error } = await createAdminClient()
    .from('orders')
    .select('id, customer_id, status, order_number')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[getOrderForEvaluation] Error fetching order:', error);
    return null;
  }
  return data as EvaluationOrder | null;
}

/** Whether the order already has an evaluation. Null when the read failed (logged). */
export async function hasEvaluation(orderId: string): Promise<boolean | null> {
  const { data, error } = await createAdminClient()
    .from('order_evaluations')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[hasEvaluation] Error fetching evaluation:', error);
    return null;
  }
  return data !== null;
}

/**
 * Which of the given orders already have an evaluation. Null when the read
 * failed (logged). An empty list answers an empty set without a query.
 */
export async function getEvaluatedOrderIds(orderIds: string[]): Promise<Set<string> | null> {
  if (orderIds.length === 0) return new Set();

  const { data, error } = await createAdminClient()
    .from('order_evaluations')
    .select('order_id')
    .in('order_id', orderIds);

  if (error || !data) {
    console.error('[getEvaluatedOrderIds] Error fetching evaluations:', error);
    return null;
  }
  return new Set(data.map((row) => row.order_id as string));
}

/**
 * Stores one evaluation. 'duplicate' when the order already has one (the
 * UNIQUE(order_id) constraint, Postgres 23505) — a double submit, not an error.
 */
export async function createEvaluation(evaluation: {
  order_id: string;
  customer_id: string;
  form_version: string;
  answers: EvaluationAnswers;
}): Promise<'created' | 'duplicate' | 'error'> {
  const { error } = await createAdminClient().from('order_evaluations').insert(evaluation);

  if (!error) return 'created';
  if (error.code === '23505') return 'duplicate';
  console.error('[createEvaluation] Error inserting evaluation:', error);
  return 'error';
}

/**
 * Whether the customer still gets the full form (the first-time questions).
 * False when they have answered them once — and false when the read fails
 * (logged): the short form is the safe default.
 */
export async function needsFullEvaluation(customerId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('order_evaluations')
    .select('answers')
    .eq('customer_id', customerId);

  if (error || !data) {
    console.error('[needsFullEvaluation] Error fetching evaluations:', error);
    return false;
  }
  return !hasAnsweredFirstTimeQuestions(data.map((row) => row.answers as EvaluationAnswers));
}

export interface EvaluationWithDetails extends OrderEvaluation {
  order: { id: string; order_number: string } | null;
  customer: { id: string; user: { full_name: string } } | null;
}

/** Every evaluation, newest first, for /admin/evaluations. Null when the read failed (logged). */
export async function getAllEvaluations(): Promise<EvaluationWithDetails[] | null> {
  const { data, error } = await createAdminClient()
    .from('order_evaluations')
    .select(`
      *,
      order:orders(id, order_number),
      customer:customers(id, user:users!user_id(full_name))
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllEvaluations] Error fetching evaluations:', error);
    return null;
  }
  return data as EvaluationWithDetails[];
}

/**
 * The cleaner's rating over every evaluated order they hold (orders.cleaner_id),
 * all-time. Null when the read failed (logged).
 */
export async function getCleanerRating(cleanerId: string): Promise<CleanerRating | null> {
  const { data, error } = await createAdminClient()
    .from('order_evaluations')
    .select('answers, orders!inner(cleaner_id)')
    .eq('orders.cleaner_id', cleanerId);

  if (error || !data) {
    console.error('[getCleanerRating] Error fetching evaluations:', error);
    return null;
  }
  return cleanerRating(data.map((row) => row.answers as EvaluationAnswers));
}
