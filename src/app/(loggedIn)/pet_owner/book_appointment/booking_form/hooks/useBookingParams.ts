import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDateLong } from '../utils/dateFormat';

export function useBookingParams() {
  const searchParams = useSearchParams();

  const spId = searchParams.get('sp_id') || '';
  const dateStr = searchParams.get('date') || '2026-08-20';
  const timeSlot = searchParams.get('time') || '9:00 AM';
  const queryPetsCount = parseInt(searchParams.get('pets') || '1', 10);
  const statusParam = searchParams.get('status');
  const bookingIdParam = searchParams.get('booking_id');

  const formattedDateDisplay = useMemo(() => formatDateLong(dateStr), [dateStr]);

  return {
    spId,
    dateStr,
    timeSlot,
    queryPetsCount,
    statusParam,
    bookingIdParam,
    formattedDateDisplay,
  };
}