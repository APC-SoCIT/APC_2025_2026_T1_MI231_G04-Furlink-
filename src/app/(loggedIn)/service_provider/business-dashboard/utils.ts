// Utility functions for Business Dashboard

/**
 * Format currency to Philippine Peso format
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num) ? '₱0.00' : `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format percentage with + or - sign
 */
export const formatTrend = (percentage: number): string => {
  if (percentage > 0) return `+${percentage}%`;
  if (percentage < 0) return `${percentage}%`;
  return '0%';
};

/**
 * Get trend direction based on percentage
 */
export const getTrendDirection = (percentage: number): 'up' | 'down' | 'neutral' => {
  if (percentage > 0) return 'up';
  if (percentage < 0) return 'down';
  return 'neutral';
};

/**
 * Format date to readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Abbreviate large numbers (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

/**
 * Get month name from month number
 */
export const getMonthName = (monthIndex: number): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthIndex] || '';
};

/**
 * Calculate average from array of numbers
 */
export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
};