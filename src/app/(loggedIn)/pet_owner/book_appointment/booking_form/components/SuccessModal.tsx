'use client';

import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

export const SuccessModal: React.FC<{ onRedirect: () => void }> = ({ onRedirect }) => (
  <div className="modal-backdrop">
    <div className="success-modal-card">
      <div className="success-icon-wrapper">
        <FaCheckCircle className="success-green-check" />
      </div>
      <h2 className="success-title">Payment Completed!</h2>
      <p className="success-message">
        Your payment has been successfully processed and your booking request is submitted. Please wait for the provider to confirm your slot.
      </p>
      <button className="btn-return-home" onClick={onRedirect}>
        Go to Manage Bookings
      </button>
    </div>
  </div>
);