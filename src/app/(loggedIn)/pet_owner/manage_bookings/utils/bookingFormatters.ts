import { SortOrder } from '../types/booking';

export const formatDateDisplay = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatTimeDisplay = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  return timeStr;
};

export const formatStatusLabel = (status: string) => {
  if (status === 'to_refund') return 'TO REFUND';
  if (status === 'cancelled_by_po') return 'CANCELLED BY YOU';
  return status.replace(/_/g, ' ').toUpperCase();
};

export const getStatusCssClass = (status: string) => {
  return status.replace(/\s+/g, '-').toLowerCase();
};

// Builds the booking's start Date (local time) from its date ("YYYY-MM-DD") and
// timeslot ("9:00 AM", "09:00:00" or a range such as "9:00 AM - 10:00 AM" -> start time)
export const getBookingStartDate = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day);

  const match = (timeStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    start.setHours(hours, parseInt(match[2], 10));
  }

  return start;
};

// Returns a copy sorted by booking date + start time (ascending = oldest first)
export const sortByBookingStart = <T extends { booking_date: string; booking_timeslot: string }>(
  items: T[],
  order: SortOrder
): T[] => {
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort(
    (a, b) =>
      (getBookingStartDate(a.booking_date, a.booking_timeslot).getTime() -
        getBookingStartDate(b.booking_date, b.booking_timeslot).getTime()) *
      direction
  );
};
