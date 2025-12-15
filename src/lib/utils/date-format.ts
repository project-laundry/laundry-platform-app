// Date formatting utilities for Norwegian locale

import { getRelativeTimeLabel } from './relative-time';

/**
 * Get compact date label in Norwegian format
 * @param date - The date to format
 * @returns Compact date string (e.g., "18. des")
 */
export function getCompactDateLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);

  const formatted = dateObj.toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short'
  });

  // Remove trailing period if present (e.g., "des." -> "des")
  return formatted.replace(/\.$/, '');
}

/**
 * Get relative date display combining relative time and compact date
 * @param date - The date to format
 * @returns Combined display string (e.g., "I morgen • 18. des")
 */
export function getRelativeDateDisplay(date: Date | string): string {
  const relative = getRelativeTimeLabel(date);
  const compact = getCompactDateLabel(date);
  return `${relative} • ${compact}`;
}
