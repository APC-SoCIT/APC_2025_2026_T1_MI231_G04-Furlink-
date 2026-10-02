import { useEffect, useState } from 'react';

/** Tracks the current booking id; syncs it from the URL when PayMongo redirects back. */
export function useActiveBookingId(bookingIdParam: string | null) {
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (bookingIdParam && !activeBookingId) {
      setActiveBookingId(bookingIdParam);
    }
  }, [bookingIdParam, activeBookingId]);

  return [activeBookingId, setActiveBookingId] as const;
}