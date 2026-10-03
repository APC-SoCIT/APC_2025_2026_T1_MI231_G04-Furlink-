import { Dispatch, SetStateAction, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PetFormData, ServiceOption } from '../types';
import { saveBooking } from '../services/bookingService';

interface Args {
  supabase: SupabaseClient;
  getFreshUser: () => Promise<{ id: string } | null>;

  spId: string;
  dateStr: string;
  timeSlot: string;
  formattedDateDisplay: string;
  petForms: PetFormData[];
  availableServices: ServiceOption[];
  grandTotal: number;

  activeBookingId: string | null;
  setActiveBookingId: Dispatch<SetStateAction<string | null>>;

  cooldownUntil: number | null;
  timeRemaining: string;
  registerAttempt: (bookingId: string) => void;

  setShowFailedModal: Dispatch<SetStateAction<boolean>>;
  setShowSummaryModal: Dispatch<SetStateAction<boolean>>;
  setShowPayLaterSuccessModal: Dispatch<SetStateAction<boolean>>;
  setShowCapacityModal: Dispatch<SetStateAction<boolean>>; // <-- Added modal setter
}

export function useBookingActions({
  supabase,
  getFreshUser,
  spId,
  dateStr,
  timeSlot,
  formattedDateDisplay,
  petForms,
  availableServices,
  grandTotal,
  activeBookingId,
  setActiveBookingId,
  cooldownUntil,
  timeRemaining,
  registerAttempt,
  setShowFailedModal,
  setShowSummaryModal,
  setShowPayLaterSuccessModal,
  setShowCapacityModal, // <-- Destructure here
}: Args) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPayLater, setIsSavingPayLater] = useState(false);

  // Remembers which booking this page session created and what the form looked like
  // when it was saved, so a retry only reuses it if the form hasn't changed.
  const savedRef = useRef<{ bookingId: string; signature: string } | null>(null);

  // The booking last created for THIS slot in this browser tab. If the user leaves
  // PayMongo with the browser Back button the page reloads without a booking_id, and
  // the old 'to pay' booking would otherwise keep holding the slot next to the new one.
  const draftKey = `furlink_draft_booking:${spId}:${dateStr}:${timeSlot}`;

  const releaseStaleDraft = async () => {
    try {
      const staleId = window.sessionStorage.getItem(draftKey);
      if (staleId) {
        await supabase
          .from('booking_info')
          .update({ booking_status: 'cancelled' })
          .eq('id', staleId)
          .eq('booking_status', 'to pay'); // never touches a paid / approved booking
        window.sessionStorage.removeItem(draftKey);
      }
    } catch {
      /* sessionStorage unavailable: nothing to release */
    }
  };

  const getFormSignature = () =>
    JSON.stringify({ petForms, grandTotal, spId, dateStr, timeSlot }, (_k, v) =>
      typeof File !== 'undefined' && v instanceof File ? `file:${v.name}:${v.size}` : v,
    );

  /**
   * Makes sure the whole booking form is saved (booking, pets, services, documents)
   * with status 'to pay' BEFORE the user is sent to PayMongo. If payment fails or is
   * abandoned the booking therefore still exists as 'to pay'. Returns null when the
   * slot is full.
   */
  const ensureBooking = async (): Promise<string | null> => {
    const signature = getFormSignature();

    // Same session, form unchanged: already saved, reuse it.
    if (savedRef.current && savedRef.current.signature === signature) {
      return savedRef.current.bookingId;
    }

    // Returned from PayMongo (booking id came from the URL): the page reloaded, so the
    // form in memory is blank. The booking was fully saved before payment; reuse it
    // untouched instead of overwriting it with empty form data.
    if (activeBookingId && !savedRef.current) {
      return activeBookingId;
    }

    // Form was edited after an earlier save in this session: release the old hold.
    if (savedRef.current) {
      await supabase
        .from('booking_info')
        .update({ booking_status: 'cancelled' })
        .eq('id', savedRef.current.bookingId);
      savedRef.current = null;
      setActiveBookingId(null);
    }

    const user = await getFreshUser();
    if (!user) throw new Error('User authentication failed. Please log in again.');

    await releaseStaleDraft();

    let createdId = null as string | null;
    try {
      const bookingId = await saveBooking({
        supabase,
        userId: user.id,
        spId,
        dateStr,
        timeSlot,
        grandTotal,
        petForms,
        availableServices,
        bookingStatus: 'to pay',
        onBookingCreated: (id) => {
          createdId = id;
          setActiveBookingId(id);
        },
      });
      savedRef.current = { bookingId, signature };
      try {
        window.sessionStorage.setItem(draftKey, bookingId);
      } catch {
        /* ignore */
      }
      return bookingId;
    } catch (err: any) {
      if (createdId) setActiveBookingId(null); // saveBooking already cancelled the row
      const msg = (err.message || '').toLowerCase();
      // Database capacity trigger exceptions
      if (msg.includes('fully booked') || msg.includes('capacity') || msg.includes('slot')) {
        return null;
      }
      throw new Error(err.message || 'Failed to save booking.');
    }
  };

  const handleConfirmBooking = async () => {
    if (grandTotal <= 0 && !activeBookingId) {
      alert('Invalid Booking: Total amount cannot be ₱0.00.');
      return;
    }
    if (cooldownUntil && Date.now() < cooldownUntil) {
      alert(`Payment attempts exceeded. Please try again in ${timeRemaining}.`);
      return;
    }

    setIsSubmitting(true);
    setShowFailedModal(false);

    try {
      const bookingId = await ensureBooking();

      // If ensureBooking returned null, it means a capacity trigger intercepted it
      if (!bookingId) {
        setShowSummaryModal(false);
        setShowCapacityModal(true);
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/paymongo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: grandTotal > 0 ? grandTotal : 1,
          description: `Pet Grooming Session on ${formattedDateDisplay}`,
          bookingId,
        }),
      });

      const result = await response.json();
      
      // Handle server-side capacity response from checkout route gracefully
      if (response.status === 400 && (result.error?.includes('fully booked') || result.error?.includes('slot'))) {
        setShowSummaryModal(false);
        setShowCapacityModal(true);
        setIsSubmitting(false);
        return;
      }

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || 'Failed to initialize payment.');
      }

      registerAttempt(bookingId);

      window.location.href = result.checkoutUrl;
      setShowSummaryModal(false);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Booking processing error:', err);
      alert(`Booking Error: ${err.message || 'An error occurred while initiating payment.'}`);
      setIsSubmitting(false);
    }
  };

  const handlePayLater = async () => {
    if (grandTotal <= 0 && !activeBookingId) {
      alert('Invalid Booking: Total amount cannot be ₱0.00.');
      return;
    }

    setIsSavingPayLater(true);
    try {
      const bookingId = await ensureBooking();
      if (!bookingId) {
        setShowSummaryModal(false);
        setShowCapacityModal(true);
        setIsSavingPayLater(false);
        return;
      }

      const { error } = await supabase
        .from('booking_info')
        .update({ booking_status: 'to pay' })
        .eq('id', bookingId);

      if (error) throw new Error(error.message);

      setShowFailedModal(false);
      setShowPayLaterSuccessModal(true);
    } catch (err: any) {
      console.error('Pay Later Save Error:', err);
      alert(`Error saving booking for later: ${err.message}`);
    } finally {
      setIsSavingPayLater(false);
    }
  };

  return { isSubmitting, isSavingPayLater, handleConfirmBooking, handlePayLater };
}