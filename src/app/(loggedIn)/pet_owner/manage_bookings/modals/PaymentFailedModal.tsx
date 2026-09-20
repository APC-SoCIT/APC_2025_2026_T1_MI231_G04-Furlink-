'use client';

import React from 'react';
import { FaTimesCircle, FaClock } from 'react-icons/fa';

interface PaymentFailedModalProps {
  cooldownUntil: number | null;
  timeRemaining: string;
  paymentAttempts: number;
  isSavingPayLater: boolean;
  onRetry: () => void;
  onPayLater: () => void;
}

export default function PaymentFailedModal({
  cooldownUntil,
  timeRemaining,
  paymentAttempts,
  isSavingPayLater,
  onRetry,
  onPayLater,
}: PaymentFailedModalProps) {
  // Calculate remaining attempts accurately (max 3)
  const remainingAttempts = Math.max(0, 3 - paymentAttempts);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          maxWidth: '420px',
          width: '90%',
          padding: '30px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ color: '#dc3545', fontSize: '50px', marginBottom: '15px' }}>
          <FaTimesCircle />
        </div>
        
        <h2 style={{ marginBottom: '10px', fontSize: '20px', color: '#111', fontWeight: 'bold' }}>
          Payment Incomplete or Cancelled
        </h2>

        {cooldownUntil ? (
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            You have reached the maximum number of payment attempts (3/3). Online payment attempts are temporarily locked. Please try again in <strong>{timeRemaining}</strong> or choose <strong>Pay Later</strong>.
          </p>
        ) : (
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            Your payment transaction was not completed. You have <strong>{remainingAttempts}</strong> attempt(s) remaining before a 1-hour cooldown.
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            disabled={isSavingPayLater || cooldownUntil !== null}
            onClick={onRetry}
            className="row-action-btn primary"
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              cursor: cooldownUntil !== null ? 'not-allowed' : 'pointer',
              opacity: cooldownUntil !== null ? 0.6 : 1,
            }}
          >
            {cooldownUntil ? 'Locked' : 'Try Again'}
          </button>

          <button
            disabled={isSavingPayLater}
            onClick={onPayLater}
            className="row-action-btn secondary"
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <FaClock />
            {isSavingPayLater ? 'Saving...' : 'Pay Later'}
          </button>
        </div>
      </div>
    </div>
  );
}