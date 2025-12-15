// Relative time utilities for displaying dates in Norwegian

/**
 * Get relative time label in Norwegian
 * @param date - The target date to compare against today
 * @returns Norwegian relative time label (e.g., "I dag", "I morgen", "torsdag")
 */
export function getRelativeTimeLabel(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  const today = new Date();

  // Normalize both dates to midnight for accurate day comparison
  targetDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I morgen';
  if (diffDays < 0) return 'Tidligere'; // Fallback for past dates

  // For dates after tomorrow, show the weekday name
  return targetDate.toLocaleDateString('no-NO', { weekday: 'long' });
}
