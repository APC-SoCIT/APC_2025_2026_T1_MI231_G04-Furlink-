import { Dispatch, SetStateAction, useState } from 'react';
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
  registerAttempt: () => void;

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

const ensureBooking = async (): Promise<string | null> => {
    // 1. If a temporary hold ID already exists from the widget, reuse and update it
    if (activeBookingId) {
      const { error: updateErr } = await supabase
        .from('booking_info')
        .update({
          pet_count: petForms.length,
          booking_total_amount: grandTotal,
        })
        .eq('id', activeBookingId);

      if (!updateErr) {
        // Attach pet info records to the held booking
        for (const pet of petForms) {
          const p = pet as any;
          await supabase.from('booking_pet_info').insert([
            {
              booking_info_id: activeBookingId,
              pet_name: p.name || p.petName || 'Pet',
              pet_type: p.type || p.petType || 'dog',
              pet_breed: p.breed || p.petBreed || '',
              pet_size: p.size || p.petSize || '',
              pet_weight: p.weight || p.petWeight || 0,
              service_id: p.selectedServiceId || p.selectedServices?.[0] || null,
            },
          ]);
        }
        return activeBookingId;
      }
    }

    const user = await getFreshUser();
    if (!user) throw new Error('User authentication failed. Please log in again.');

    try {
      // 2. Fallback: Insert new booking if no widget draft hold exists
      const totalPetsCount = petForms.length;
      const { data: booking, error: bookingError } = await supabase
        .from('booking_info')
        .insert([
          {
            profiles_id: user.id,
            sp_id: spId,
            booking_date: dateStr,
            booking_timeslot: timeSlot,
            booking_status: 'pending_sp_response',
            pet_count: totalPetsCount,
            booking_total_amount: grandTotal,
          },
        ])
        .select()
        .single();

      if (bookingError) throw new Error(bookingError.message);
      const bookingId = booking.id;
      setActiveBookingId(bookingId);

      for (const pet of petForms) {
        const p = pet as any;
        await supabase.from('booking_pet_info').insert([
          {
            booking_info_id: bookingId,
            pet_name: p.name || p.petName || 'Pet',
            pet_type: p.type || p.petType || 'dog',
            pet_breed: p.breed || p.petBreed || '',
            pet_size: p.size || p.petSize || '',
            pet_weight: p.weight || p.petWeight || 0,
            service_id: p.selectedServiceId || p.selectedServices?.[0] || null,
          },
        ]);
      }

      return bookingId;
    } catch (err: any) {
      const msg = err.message || '';
      // Intercept database capacity trigger exceptions cleanly
      if (msg.toLowerCase().includes('fully booked') || msg.toLowerCase().includes('capacity') || msg.toLowerCase().includes('slot')) {
        return null;
      }
      throw new Error(msg || 'Failed to secure slot.');
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