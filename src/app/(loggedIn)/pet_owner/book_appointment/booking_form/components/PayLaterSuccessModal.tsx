'use client';

import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

export const PayLaterSuccessModal: React.FC<{ onRedirect: () => void }> = ({ onRedirect }) => (
  <div className="modal-backdrop">
    <div className="success-modal-card">
      <div className="success-icon-wrapper">
        <FaCheckCircle className="success-green-check" />
      </div>
      <h2 className="success-title">Booking Saved!</h2>
      <p className="success-message">
        Your booking status has been updated to <strong>"To Pay"</strong>. You can view and manage your booking anytime from your appointments dashboard.
      </p>
      <button className="btn-return-home" onClick={onRedirect}>
        Go to Manage Bookings
      </button>
    </div>
  </div>
);