'use client';

import React from 'react';
import { FaExclamation } from 'react-icons/fa';

interface CapacityModalProps {
  slotCapacity: number;
  timeSlot: string;
  onClose: () => void;
}

export const CapacityModal: React.FC<CapacityModalProps> = ({ slotCapacity, timeSlot, onClose }) => (
  <div className="capacity-modal-overlay">
    <div className="capacity-modal-card">
      <div className="capacity-icon-circle">
        <FaExclamation className="capacity-exclamation-icon" />
      </div>
      <h2 className="capacity-modal-title">Capacity Reached</h2>
      <p className="capacity-modal-message">
        We apologize, but this shop only has <strong>{slotCapacity} slot(s)</strong> remaining for your selected time:
      </p>
      <p className="capacity-modal-time">
        <strong>{timeSlot}</strong>.
      </p>
      <button className="capacity-modal-btn" onClick={onClose}>
        Got it
      </button>
    </div>
  </div>
);