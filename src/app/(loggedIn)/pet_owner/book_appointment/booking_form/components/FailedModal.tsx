'use client';

import React from 'react';
import { FaTimesCircle, FaClock } from 'react-icons/fa';

interface FailedModalProps {
  cooldownUntil: number | null;
  timeRemaining: string;
  paymentAttempts: number;
  isSavingPayLater: boolean;
  onRetry: () => void;
  onPayLater: () => void;
}

export const FailedModal: React.FC<FailedModalProps> = ({
  cooldownUntil,
  timeRemaining,
  paymentAttempts,
  isSavingPayLater,
  onRetry,
  onPayLater,
}) => (
  <div className="modal-backdrop">
    <div className="success-modal-card">
      <div className="failed-icon-wrapper">
        <FaTimesCircle className="failed-red-cross" />
      </div>
      <h2 className="failed-title">Payment Incomplete or Cancelled</h2>
      {cooldownUntil ? (
        <p className="success-message">
          You have reached the maximum number of payment attempts (3/3). Online payment attempts are temporarily locked. Please try again in <strong>{timeRemaining}</strong> or choose <strong>Pay Later</strong>.
        </p>
      ) : (
        <p className="success-message">
          Your payment transaction was not completed. You have <strong>{3 - paymentAttempts}</strong> attempt(s) remaining before a 1-hour cooldown.
        </p>
      )}

      <div className="failed-modal-actions">
        <button
          className="btn-try-again"
          disabled={isSavingPayLater || cooldownUntil !== null}
          onClick={onRetry}
        >
          {cooldownUntil ? 'Locked' : 'Try Again'}
        </button>
        <button className="btn-pay-later" disabled={isSavingPayLater} onClick={onPayLater}>
          <FaClock />
          {isSavingPayLater ? 'Saving...' : 'Pay Later'}
        </button>
      </div>
    </div>
  </div>
);