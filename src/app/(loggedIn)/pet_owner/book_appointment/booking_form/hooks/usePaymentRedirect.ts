import { Dispatch, SetStateAction, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Args {
  supabase: SupabaseClient;
  statusParam: string | null;
  activeBookingId: string | null;
  setShowSuccessModal: Dispatch<SetStateAction<boolean>>;
  setShowFailedModal: Dispatch<SetStateAction<boolean>>;
  setShowSummaryModal: Dispatch<SetStateAction<boolean>>;
}

/**
 * Handles the ?status= redirect from PayMongo: verifies the payment server-side
 * (syncing paymongo_session_id / paymongo_payment_id) and opens the right modal.
 */
export function usePaymentRedirect({
  supabase,
  statusParam,
  activeBookingId,
  setShowSuccessModal,
  setShowFailedModal,
  setShowSummaryModal,
}: Args) {
  useEffect(() => {
    const handleRedirect = async () => {
      if (statusParam === 'success') {
        if (activeBookingId) {
          try {
            const verifyRes = await fetch(`/api/paymongo/verify?booking_id=${activeBookingId}`);
            if (!verifyRes.ok) {
              // Fallback simple status update if the verification API errors out
              await supabase
                .from('booking_info')
                .update({ booking_status: 'pending_sp_response' })
                .eq('id', activeBookingId);
            }
          } catch (err) {
            console.error('Error during payment success synchronization:', err);
          }
        }
        setShowSuccessModal(true);
        setShowFailedModal(false);
        setShowSummaryModal(false);
      } else if (
        statusParam === 'failed' ||
        statusParam === 'cancelled' ||
        statusParam === 'expired'
      ) {
        setShowFailedModal(true);
        setShowSuccessModal(false);
        setShowSummaryModal(false);
      } else {
        setShowFailedModal(false);
      }
    };
    handleRedirect();
  }, [
    statusParam,
    activeBookingId,
    supabase,
    setShowSuccessModal,
    setShowFailedModal,
    setShowSummaryModal,
  ]);
}