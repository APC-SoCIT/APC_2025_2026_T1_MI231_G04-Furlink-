'use client';

import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { formatDateDisplay, formatTimeDisplay } from '../utils/bookingFormatters';

interface RescheduleSuccessModalProps {
  newDate: string; // YYYY-MM-DD
  newTimeslot: string;
  onClose: () => void;
}

// Confirmation shown after a booking has been rescheduled (same look as PaymentSuccessModal)
export default function RescheduleSuccessModal({
  newDate,
  newTimeslot,
  onClose,
}: RescheduleSuccessModalProps) {
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
          maxWidth: '400px',
          width: '90%',
          padding: '30px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ color: '#28a745', fontSize: '50px', marginBottom: '15px' }}>
          <FaCheckCircle />
        </div>
        <h2 style={{ marginBottom: '10px', fontSize: '22px', color: '#111', fontWeight: 'bold' }}>
          Booking Rescheduled!
        </h2>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
          Your appointment has been moved to{' '}
          <strong>{formatDateDisplay(newDate)}</strong> at{' '}
          <strong>{formatTimeDisplay(newTimeslot)}</strong>.
        </p>
        <button
          onClick={onClose}
          className="row-action-btn primary"
          style={{ width: '100%', padding: '12px', fontSize: '15px', cursor: 'pointer' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
