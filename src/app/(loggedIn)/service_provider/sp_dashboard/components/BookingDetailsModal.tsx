import React, { useState } from 'react';
import { Booking, BookingStatus } from '../type';
import { formatCurrency, formatStatus } from '../utils';

interface BookingDetailsModalProps {
  selectedBooking: Booking;
  setSelectedBooking: (booking: Booking | null) => void;
  handleUpdateStatus: (id: string, newStatus: BookingStatus, reason?: string) => void;
}

export default function BookingDetailsModal({ 
  selectedBooking, 
  setSelectedBooking, 
  handleUpdateStatus 
}: BookingDetailsModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    handleUpdateStatus(selectedBooking.id, 'rejected', rejectionReason);
    setShowRejectInput(false);
    setRejectionReason('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30, 58, 138, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '1.5rem', maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'black', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          Booking Details
        </h3>
        
        {/* Basic Booking Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: '#64748b', display: 'block' }}>Date & Time</span><strong>{selectedBooking.booking_date} ({selectedBooking.booking_timeslot})</strong></div>
          <div><span style={{ color: '#64748b', display: 'block' }}>Total Amount</span><strong>{formatCurrency(selectedBooking.booking_total_amount)}</strong></div>
          <div><span style={{ color: '#64748b', display: 'block' }}>Status</span><strong style={{ textTransform: 'capitalize' }}>{formatStatus(selectedBooking.booking_status)}</strong></div>
          <div><span style={{ color: '#64748b', display: 'block' }}>Created At</span><strong>{new Date(selectedBooking.created_at).toLocaleString()}</strong></div>
        </div>

        {/* Rejection Reason (if exists) */}
        {selectedBooking.booking_rejection_reason && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rejection Reason</p>
            <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>{selectedBooking.booking_rejection_reason}</p>
          </div>
        )}

        {/* Pets & Services Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>Pet(s) & Services</h4>
          {selectedBooking.booking_pet_info && selectedBooking.booking_pet_info.length > 0 ? (
            selectedBooking.booking_pet_info.map((pet) => (
              <div key={pet.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{pet.booking_pet_name} <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '0.85rem' }}>({pet.booking_pet_type})</span></p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                  <p><strong>Breed:</strong> {pet.booking_breed}</p>
                  <p><strong>Gender:</strong> {pet.booking_gender}</p>
                  <p><strong>Weight:</strong> {pet.booking_weight} kg ({pet.booking_calculated_size})</p>
                  <p><strong>Behavior:</strong> {pet.booking_behavior?.join(', ') || 'N/A'}</p>
                </div>

                {/* Nested Services List */}
                {pet.booking_service_info && pet.booking_service_info.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Services:</p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#475569' }}>
                      {pet.booking_service_info.map((srv) => (
                        <li key={srv.id}>
                          {srv.booking_service_name} - {formatCurrency(srv.booking_price)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>No pet information attached.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          {selectedBooking.booking_status === 'pending_sp_response' && (
            <>
              {showRejectInput && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rejection Reason:</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                    rows={3}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button
                      onClick={handleReject}
                      style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectionReason('');
                      }}
                      style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {!showRejectInput && (
                <>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    style={{ padding: '0.75rem 1.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#fecaca')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#fee2e2')}
                  >
                    Reject Booking
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'approved')}
                    style={{ padding: '0.75rem 1.5rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#1d4ed8')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#1e3a8a')}
                  >
                    Approve Booking
                  </button>
                </>
              )}
            </>
          )}
          <button
            onClick={() => {
              setSelectedBooking(null);
              setShowRejectInput(false);
              setRejectionReason('');
            }}
            style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}