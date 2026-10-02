import { useState } from 'react';

export function useBookingModals() {
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showPayLaterSuccessModal, setShowPayLaterSuccessModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);

  return {
    showSummaryModal,
    setShowSummaryModal,
    showSuccessModal,
    setShowSuccessModal,
    showFailedModal,
    setShowFailedModal,
    showPayLaterSuccessModal,
    setShowPayLaterSuccessModal,
    showCapacityModal,
    setShowCapacityModal,
  };
}