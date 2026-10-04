import { Booking, BookingStatus } from "./type";

/**
 * Formats the database enum status into a clean, human-readable string.
 * Example: 'pending_sp_response' -> 'pending sp response'
 */
export const formatStatus = (status: BookingStatus | string): string => {
  if (!status) return 'unknown';
  return status.replace(/_/g, ' ');
};

/**
 * Formats a raw number into Philippine Peso currency format.
 * Example: 600.5 -> "₱600.50"
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num) ? '₱0.00' : `₱${num.toFixed(2)}`;
};

/**
 * Filters bookings based on the currently active tab.
 */
export const filterBookingsByStatus = (
  bookings: Booking[], 
  activeTab: BookingStatus | 'all'
): Booking[] => {
  if (activeTab === 'all') return bookings;
  return bookings.filter((b) => b.booking_status === activeTab);
};

// NEW: Formats date to 'Dec 20, 2026'
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// NEW: Formats date and time to 'Dec 20, 2026, 10:00 AM'
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};