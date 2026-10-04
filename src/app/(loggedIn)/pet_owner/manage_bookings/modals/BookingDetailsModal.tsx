import React from 'react';
import {
  FaTimes,
  FaFileAlt,
  FaCalendarAlt,
  FaCommentAlt,
  FaMagic,
  FaExclamationCircle,
  FaStar,
  FaStore,
  FaSync,
} from 'react-icons/fa';
import { BookingRecord, BookingTab } from '../types/booking';
import { formatDateDisplay, formatTimeDisplay, formatStatusLabel } from '../utils/bookingFormatters';
import { useAccountStatus } from '@/context/AccountStatusContext';

// Tabs from which the pet owner is still allowed to cancel the booking.
// to_pay: No refund (payment not completed)
// awaiting_approval/upcoming: 25% refund to PO, 75% to SP
const CANCELLABLE_TABS: BookingTab[] = ['to_pay', 'awaiting_approval', 'upcoming'];

// Tabs where reschedule is allowed: only while the booking is awaiting provider approval
const RESCHEDULABLE_TABS: BookingTab[] = ['awaiting_approval'];

// A suspended account cannot cancel or reschedule bookings that are awaiting approval or approved
const LOCKED_WHEN_SUSPENDED: BookingTab[] = ['awaiting_approval', 'upcoming'];

interface BookingDetailsModalProps {
  selectedBooking: BookingRecord;
  activeTab: BookingTab;
  onClose: () => void;
  onPayNow: (bookingId: string) => void;
  onReschedule: () => void;
  onCancelBooking: () => void;
}

export default function BookingDetailsModal(
  {
    selectedBooking,
    activeTab,
    onClose,
    onPayNow,
    onReschedule,
    onCancelBooking,
  }: BookingDetailsModalProps
) {
  const { isSuspended } = useAccountStatus();
  const lockedBySuspension = isSuspended && LOCKED_WHEN_SUSPENDED.includes(activeTab);

  return (
    <div className="modal-backdrop">
      <div className="summary-modal-card">
        <div className="summary-modal-header">
          <div className="modal-header-title">
            <FaFileAlt className="header-doc-icon" />
            <h2>Booking Details</h2>
          </div>
          <button className="modal-close-x" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="summary-modal-body">
          <div className="details-schedule-banner">
            <FaCalendarAlt className="schedule-banner-icon" />
            <div>
              <strong>{formatDateDisplay(selectedBooking.booking_date)}</strong>
              <span> at {formatTimeDisplay(selectedBooking.booking_timeslot)}</span>
              <div className="modal-status-inline">
                Status: <span className="status-highlight">{formatStatusLabel(selectedBooking.booking_status)}</span>
              </div>
            </div>
          </div>

          {/* Service provider the booking was made with (always shown) */}
          <div className="details-provider-row">
            <FaStore className="schedule-banner-icon" />
            <span>
              Service Provider:{' '}
              <strong>{selectedBooking.sp_general_info?.business_name || 'Unknown provider'}</strong>
            </span>
          </div>

          {selectedBooking.booking_rejection_reason && (
            <div className="rejection-reason-box">
              <strong>Cancellation/Refund Reason:</strong> {selectedBooking.booking_rejection_reason}
            </div>
          )}

          {/* Conditional Rating & Review Section */}
          {(selectedBooking.booking_overall_rating ||
            selectedBooking.booking_staff_rating ||
            selectedBooking.booking_review) && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '16px',
                borderRadius: '10px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#1e3a8a',
                  fontWeight: 600,
                }}
              >
                <FaStar style={{ color: '#f59e0b' }} /> Customer Rating & Review
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                {selectedBooking.booking_overall_rating && (
                  <span>
                    Overall Rating:{' '}
                    <strong style={{ color: '#1e293b' }}>
                      {selectedBooking.booking_overall_rating} / 5 ★
                    </strong>
                  </span>
                )}
                {selectedBooking.booking_staff_rating && (
                  <span>
                    Staff Rating:{' '}
                    <strong style={{ color: '#1e293b' }}>
                      {selectedBooking.booking_staff_rating} / 5 ★
                    </strong>
                  </span>
                )}
              </div>
              {selectedBooking.booking_review && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                  <FaCommentAlt style={{ marginTop: '2px', color: '#1e3a8a', flexShrink: 0 }} />
                  <div>
                    <strong>Review:</strong> "{selectedBooking.booking_review}"
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedBooking.booking_comment && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <FaCommentAlt style={{ marginTop: '2px', color: '#1e3a8a' }} />
              <div>
                <strong>Booking Comment/Notes:</strong> {selectedBooking.booking_comment}
              </div>
            </div>
          )}

          {selectedBooking.booking_pet_info?.map((pet, pIdx) => {
            const petTotal =
              pet.booking_service_info?.reduce((sum, s) => sum + Number(s.booking_price || 0), 0) || 0;

            return (
              <div key={pet.id} className="summary-pet-card">
                <div className="summary-pet-top">
                  <h3 className="summary-pet-name">
                    Pet #{pIdx + 1}: {pet.booking_pet_name || 'Unnamed Pet'}
                  </h3>
                  <div className="summary-pet-total-box">
                    <span className="summary-pet-total-label">Pet Total</span>
                    <span className="summary-pet-total-val">₱{petTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="summary-pet-info-grid">
                  <div>
                    Type: <strong>{pet.booking_pet_type?.toUpperCase()}</strong>
                  </div>
                  <div>
                    Breed: <strong>{pet.booking_breed || 'N/A'}</strong>
                  </div>
                  <div>
                    Gender: <strong>{pet.booking_gender?.toUpperCase()}</strong>
                  </div>
                  <div>
                    Birth Date: <strong>{pet.booking_date_of_birth || 'N/A'}</strong>
                  </div>
                  <div>
                    Weight: <strong>{pet.booking_weight ? `${pet.booking_weight} kg` : 'N/A'}</strong>
                  </div>
                  <div>
                    Size: <strong>{pet.booking_calculated_size?.toUpperCase()}</strong>
                  </div>
                </div>

                {pet.booking_ai_haircut_url && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        color: '#166534',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      <FaMagic /> AI Haircut Style Reference:
                    </div>
                    <a href={pet.booking_ai_haircut_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                      <img
                        src={pet.booking_ai_haircut_url}
                        alt="AI Haircut Reference"
                        style={{
                          maxWidth: '140px',
                          maxHeight: '140px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                    </a>
                  </div>
                )}

                <div className="summary-services-box">
                  <div className="availed-title">AVAILED SERVICES:</div>
                  {pet.booking_service_info && pet.booking_service_info.length > 0 ? (
                    pet.booking_service_info.map((sItem) => (
                      <div key={sItem.id} className="availed-service-item">
                        <span>• {sItem.booking_service_name}</span>
                        <span>₱{Number(sItem.booking_price || 0).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="availed-service-item">
                      <span>• No service details available</span>
                      <span>₱0.00</span>
                    </div>
                  )}
                </div>

                {pet.booking_grooming_notes && (
                  <div className="summary-grooming-notes">
                    <strong>Grooming Notes:</strong> {pet.booking_grooming_notes}
                  </div>
                )}

                <div className="summary-behaviors">
                  Behaviors:{' '}
                  {pet.booking_behavior && pet.booking_behavior.length > 0 ? pet.booking_behavior.join(' / ') : 'None specified'}
                </div>

                <div className={`summary-consent-badge ${pet.booking_emergency_consent ? 'approved' : 'declined'}`}>
                  <FaExclamationCircle />
                  <span>
                    Emergency Transport Consent: {pet.booking_emergency_consent ? 'APPROVED' : 'DECLINED'}
                  </span>
                </div>
              </div>
            );
          })}

          <hr className="summary-divider" />

          <div className="summary-financials">
            <div className="financial-row total-row">
              <span>Total Amount (VAT Inclusive):</span>
              <span className="amount-bold">₱{Number(selectedBooking.booking_total_amount || 0).toFixed(2)}</span>
            </div>

            {/* Refund tab: show what is being / was returned (booking_info.refund_amount) */}
            {activeTab === 'refund' && (
              <div className="financial-row refund-row">
                <span>Refund Amount:</span>
                <span className="amount-bold">
                  {selectedBooking.refund_amount != null
                    ? `₱${Number(selectedBooking.refund_amount).toFixed(2)}`
                    : 'Pending'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="summary-modal-footer">
          {activeTab === 'to_pay' && (
            <button className="btn-primary-action" onClick={() => onPayNow(selectedBooking.id)}>
              Pay Now
            </button>
          )}

          {lockedBySuspension && (
            <p style={{ width: '100%', margin: 0, fontSize: 12, color: '#b45309', fontWeight: 600, textAlign: 'center' }}>
              Your account is suspended, so you can&apos;t cancel or reschedule this booking right now.
            </p>
          )}

          {/* Reschedule: only while awaiting approval, and not while suspended */}
          {RESCHEDULABLE_TABS.includes(activeTab) && !lockedBySuspension && (
            <button className="btn-primary-action" onClick={onReschedule} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <FaSync /> Reschedule
            </button>
          )}

          {/* Cancel: To Pay, Awaiting Approval or Approved; awaiting/approved are locked while suspended */}
          {CANCELLABLE_TABS.includes(activeTab) && !lockedBySuspension && (
            <button className="btn-cancel-booking" onClick={onCancelBooking}>
              Cancel Booking
            </button>
          )}

          <button className="btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}