'use server';

import { assignCleanerToOrder } from '@/lib/database/orders';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { createClient } from '@/lib/supabase/server';
import type { Order, Customer, User } from '@/types/database';

export interface OrderWithDetails extends Order {
  customer: Customer & { user: User };
}

export interface CleanerOption {
  id: string;
  display_name: string;
  city: string;
}

/**
 * Get all orders pending cleaner assignment with customer and address details
 */
export async function getPendingAssignmentOrders(): Promise<OrderWithDetails[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(
        *,
        user:users!user_id(*)
      )
    `)
    .eq('status', 'pending_assignment')
    .order('scheduled_date', { ascending: true });

  if (error || !orders) {
    console.error('Error fetching pending orders:', error);
    return [];
  }

  return orders as OrderWithDetails[];
}

/**
 * Get available cleaners for a specific city
 */
export async function getCleanersForCity(city: string): Promise<CleanerOption[]> {
  const cleaners = await getAvailableCleanersForCity(city);

  return cleaners.map((cleaner) => ({
    id: cleaner.id,
    display_name: cleaner.display_name,
    city: cleaner.base_city,
  }));
}

export interface AssignCleanerResult {
  success: boolean;
  error?: string;
}

/**
 * Assign a cleaner to an order
 */
export async function assignCleanerAction(
  orderId: string,
  cleanerId: string
): Promise<AssignCleanerResult> {
  const order = await assignCleanerToOrder(orderId, cleanerId);

  if (!order) {
    return { success: false, error: 'Failed to assign cleaner' };
  }

  return { success: true };
}
