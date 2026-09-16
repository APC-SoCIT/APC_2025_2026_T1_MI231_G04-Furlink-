'use client';

import React, { useState } from 'react';
import {
  FaFileAlt,
  FaTimes,
  FaExclamationCircle,
  FaCreditCard,
  FaChevronDown,
} from 'react-icons/fa';
import { PetFormData, ServiceOption } from '../types';

interface SummaryModalProps {
  petForms: PetFormData[];
  availableServices: ServiceOption[];
  grandTotal: number;
  isSubmitting: boolean;
  cooldownUntil: number | null;
  formatDateForSummary: (date: string) => string;
  onClose: () => void;
  onConfirm: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  petForms,
  availableServices,
  grandTotal,
  isSubmitting,
  cooldownUntil,
  formatDateForSummary,
  onClose,
  onConfirm,
}) => {
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);

  return (
    <div className="modal-backdrop">
      <div className="summary-modal-card">
        <div className="summary-modal-header">
          <div className="modal-header-title">
            <FaFileAlt className="header-doc-icon" />
            <h2>Booking Confirmation</h2>
          </div>
          <button className="modal-close-x" onClick={onClose} disabled={isSubmitting}>
            <FaTimes />
          </button>
        </div>

        <div className="summary-modal-body">
          {petForms.map((pet, pIdx) => {
            const petTotal = pet.selectedServices.reduce((sum, s) => sum + s.price, 0);
            return (
              <div key={pet.id} className="summary-pet-card">
                <div className="summary-pet-top">
                  <h3 className="summary-pet-name">
                    Pet #{pIdx + 1}: {pet.petName || 'Unnamed Pet'}
                  </h3>
                  <div className="summary-pet-total-box">
                    <span className="summary-pet-total-label">Pet Total</span>
                    <span className="summary-pet-total-val">₱{petTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="summary-pet-info-grid">
                  <div>Type: <strong>{pet.petType}</strong></div>
                  <div>Breed: <strong>{pet.breed || 'N/A'}</strong></div>
                  <div>Gender: <strong>{pet.gender}</strong></div>
                  <div>Birth Date: <strong>{formatDateForSummary(pet.dob)}</strong></div>
                  <div>Weight: <strong>{pet.weight ? `${pet.weight} kg` : 'N/A'}</strong></div>
                  <div>Size: <strong>{pet.calculatedSize.toUpperCase()}</strong></div>
                </div>

                <div className="summary-services-box">
                  <div className="availed-title">AVAILED SERVICES:</div>
                  {pet.selectedServices.map((sItem, sIndex) => {
                    const matchedSvc = availableServices.find((s) => s.id === sItem.serviceId);
                    return (
                      <div key={sIndex} className="availed-service-item">
                        <span>• {matchedSvc ? matchedSvc.service_name : 'No service selected'}</span>
                        <span>₱{sItem.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="summary-behaviors">
                  Behaviors: {pet.behaviors.length > 0 ? pet.behaviors.join(' / ') : 'None selected'}
                </div>

                <div className={`summary-consent-badge ${pet.emergencyConsent ? 'approved' : 'declined'}`}>
                  <FaExclamationCircle />
                  <span>Emergency Transport Consent: {pet.emergencyConsent ? 'APPROVED' : 'DECLINED'}</span>
                </div>
              </div>
            );
          })}

          <hr className="summary-divider" />

          <div className="paymongo-supported-methods">
            <div className="payment-notice-header">
              <FaCreditCard className="pay-icon" />
              <span>Secure Online Payment via PayMongo</span>
            </div>
            <div className="payment-badges-list">
              <span className="pay-badge gcash">GCash</span>
              <span className="pay-badge maya">Maya</span>
              <span className="pay-badge card">Cards</span>
              <span className="pay-badge qrph">QR Ph</span>
            </div>
          </div>

          <div className="summary-financials">
            <div className="financial-row total-row">
              <span>Total Service Amount (VAT Inclusive):</span>
              <span className="amount-bold">₱{grandTotal.toFixed(2)}</span>
            </div>

            <div className="breakdown-toggle-box">
              <button className="toggle-breakdown-btn" onClick={() => setShowPaymentBreakdown(!showPaymentBreakdown)}>
                <span>See payment breakdown</span>
                <FaChevronDown className={`chevron-icon ${showPaymentBreakdown ? 'open' : ''}`} />
              </button>

              {showPaymentBreakdown && (
                <div className="payment-breakdown-details">
                  {petForms.map((p, idx) => (
                    <div key={p.id} className="breakdown-item">
                      <span>Pet #{idx + 1} ({p.petName || 'Unnamed'}):</span>
                      <span>₱{p.selectedServices.reduce((a, b) => a + b.price, 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <hr className="breakdown-dashed-hr" />
                  <div className="breakdown-item bold-item">
                    <span>Grand Total:</span>
                    <span>₱{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="summary-modal-footer">
          <button className="btn-back-edit" onClick={onClose} disabled={isSubmitting}>
            Back to Edit
          </button>
          <button
            className="btn-confirm-booking"
            onClick={onConfirm}
            disabled={isSubmitting || cooldownUntil !== null || grandTotal <= 0}
          >
            {isSubmitting ? 'Opening Gateway...' : cooldownUntil ? 'Payment Locked' : 'Pay with PayMongo'}
          </button>
        </div>
      </div>
    </div>
  );
};