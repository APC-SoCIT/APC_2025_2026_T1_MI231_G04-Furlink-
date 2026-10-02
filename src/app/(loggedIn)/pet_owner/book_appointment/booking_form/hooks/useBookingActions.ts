import { Dispatch, SetStateAction, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PetFormData, ServiceOption } from '../types';
import { saveBooking } from '../services/bookingService';

interface Args {
  supabase: SupabaseClient;
  getFreshUser: () => Promise<{ id: string } | null>;

  // booking context
  spId: string;
  dateStr: string;
  timeSlot: string;
  formattedDateDisplay: string;
  petForms: PetFormData[];
  availableServices: ServiceOption[];
  grandTotal: number;

  // booking id state
  activeBookingId: string | null;
  setActiveBookingId: Dispatch<SetStateAction<string | null>>;

  // payment cooldown
  cooldownUntil: number | null;
  timeRemaining: string;
  registerAttempt: () => void;

  // modals
  setShowFailedModal: Dispatch<SetStateAction<boolean>>;
  setShowSummaryModal: Dispatch<SetStateAction<boolean>>;
  setShowPayLaterSuccessModal: Dispatch<SetStateAction<boolean>>;
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
}: Args) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPayLater, setIsSavingPayLater] = useState(false);

  /** Returns the existing booking id, or creates the booking and returns the new id. */
  const ensureBooking = async (): Promise<string> => {
    if (activeBookingId) return activeBookingId;

    const user = await getFreshUser();
    if (!user) throw new Error('User authentication failed. Please log in again.');

    return saveBooking({
      supabase,
      userId: user.id,
      spId,
      dateStr,
      timeSlot,
      grandTotal,
      petForms,
      availableServices,
      onBookingCreated: setActiveBookingId,
    });
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
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || 'Failed to initialize payment.');
      }

      registerAttempt();

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