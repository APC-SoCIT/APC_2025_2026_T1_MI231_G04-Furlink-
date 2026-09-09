'use client';

import React from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

interface InfoSummaryCardProps {
  dateDisplay: string;
  timeSlot: string;
  grandTotal: number;
  onProceed: () => void;
}

export const InfoSummaryCard: React.FC<InfoSummaryCardProps> = ({
  dateDisplay,
  timeSlot,
  grandTotal,
  onProceed,
}) => (
  <div className="info-summary-card">
    <div className="summary-left">
      <div className="summary-date flex-item">
        <FaCalendarAlt className="summary-icon" />
        <span>{`${dateDisplay} at ${timeSlot}`}</span>
      </div>
      <div className="summary-total">Total Amount: ₱{grandTotal.toFixed(2)}</div>
    </div>
    <div className="summary-right">
      <button className="proceed-btn" onClick={onProceed}>
        Proceed to Summary
      </button>
    </div>
  </div>
);