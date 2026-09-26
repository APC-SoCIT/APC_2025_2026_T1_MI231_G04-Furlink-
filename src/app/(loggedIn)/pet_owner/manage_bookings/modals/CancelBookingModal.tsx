import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface CancelBookingModalProps {
  bookingStatus: string; // 'pending_sp_response' | 'to pay' | 'approved'
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelBookingModal({
  bookingStatus,
  isSubmitting,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="cancel-modal-card">
        <div className="summary-modal-header">
          <div className="modal-header-title">
            <FaExclamationTriangle className="cancel-modal-warning-icon" />
            <h2>Cancel Booking</h2>
          </div>
          <button className="modal-close-x" onClick={onClose} disabled={isSubmitting}>
            <FaTimes />
          </button>
        </div>

        <div className="cancel-modal-body">
          {bookingStatus === 'to pay' ? (
            <p style={{ fontSize: '15px', color: '#64748b' }}>
              Are you sure you want to cancel this booking? No payment has been captured yet,
              so no refund is necessary.
            </p>
          ) : (
            <p style={{ fontSize: '15px', color: '#64748b' }}>
              The refund is initiated automatically once you confirm and typically reflects
              within a few business days.
            </p>
          )}
        </div>

        <div className="summary-modal-footer">
          <button className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
            Keep Booking
          </button>
          <button className="btn-danger-action" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
