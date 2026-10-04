import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Booking, BookingStatus } from '../type';
import { formatCurrency, formatStatus } from '../utils';
import { useAccountStatus } from '@/context/AccountStatusContext';

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
  const { isSuspended } = useAccountStatus();
  const supabase = createClientComponentClient();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const [approvalNote, setApprovalNote] = useState('');
  const [showApproveInput, setShowApproveInput] = useState(false);

  const [showCompleteInput, setShowCompleteInput] = useState(false);
  const [completionOutcome, setCompletionOutcome] = useState<'service_completed' | 'no_show'>('service_completed');
  const [isConfirmingNoShow, setIsConfirmingNoShow] = useState(false);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [petEmployeeAssignments, setPetEmployeeAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if ((selectedBooking.booking_status === 'paid' || selectedBooking.booking_status === 'approved') && selectedBooking.sp_id) {
      const fetchEmployees = async () => {
        const { data, error } = await supabase
          .from('sp_employees_info')
          .select('id, employee_first_name, employee_last_name, employee_position')
          .eq('sp_id', selectedBooking.sp_id);
          
        if (data && !error) setEmployees(data);
      };
      fetchEmployees();
    }
  }, [selectedBooking, supabase]);

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    handleUpdateStatus(selectedBooking.id, 'rejected', rejectionReason);
    setShowRejectInput(false);
    setRejectionReason('');
  };

  const handleApprove = async () => {
    setIsUpdating(true);
    try {
      if (approvalNote.trim()) {
        const { error } = await supabase
          .from('booking_info')
          .update({ booking_comment: approvalNote.trim() })
          .eq('id', selectedBooking.id);
        if (error) throw error;
        selectedBooking.booking_comment = approvalNote.trim();
      }
      handleUpdateStatus(selectedBooking.id, 'approved');
    } catch (err: any) {
      alert('Failed to approve booking: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEmployeeSelection = (petId: string, employeeId: string) => {
    setPetEmployeeAssignments(prev => ({ ...prev, [petId]: employeeId }));
  };

  const handleCompleteOrNoShow = async () => {
    if (completionOutcome === 'no_show') {
      if (!isConfirmingNoShow) {
        setIsConfirmingNoShow(true);
        return;
      }

      setIsUpdating(true);
      try {
        handleUpdateStatus(selectedBooking.id, 'no_show');
      } catch (err: any) {
        alert('Failed to mark as no-show: ' + err.message);
      } finally {
        setIsUpdating(false);
        setIsConfirmingNoShow(false);
      }
      return;
    }

    const pets = selectedBooking.booking_pet_info || [];
    const missingAssignments = pets.some(pet => !petEmployeeAssignments[pet.id]);
    if (missingAssignments) {
      alert('Please assign an employee for every pet in this booking.');
      return;
    }

    setIsUpdating(true);
    try {
      const updatePromises = pets.map(pet => 
        supabase
          .from('booking_pet_info')
          .update({ assigned_employee_id: petEmployeeAssignments[pet.id] })
          .eq('id', pet.id)
      );
      
      await Promise.all(updatePromises);
      handleUpdateStatus(selectedBooking.id, 'to_rate');
    } catch (err: any) {
      alert('Failed to assign employees: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAndRefund = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking? The customer will be refunded.')) return;

    setIsRefunding(true);
    try {
      const res = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          amount: selectedBooking.booking_total_amount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');

      if (data.manual_refund_required) {
        alert('Booking cancelled. \n\nNOTE: Because the customer paid via QRPh, PayMongo cannot automatically reverse the transaction. You must manually send the refund to the customer via GCash/Maya.');
      } else {
        alert('Refund initiated successfully via PayMongo.');
      }
      
      handleUpdateStatus(selectedBooking.id, 'to_refund');
    } catch (err: any) {
      alert('Error initiating refund: ' + err.message);
    } finally {
      setIsRefunding(false);
    }
  };

  const resetModal = () => {
    setSelectedBooking(null);
    setShowRejectInput(false);
    setShowApproveInput(false);
    setShowCompleteInput(false);
    setCompletionOutcome('service_completed');
    setIsConfirmingNoShow(false);
    setRejectionReason('');
    setApprovalNote('');
    setPetEmployeeAssignments({});
  };

  const renderStars = (rating?: number | null) => {
    if (!rating) return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>Not rated</span>;
    return (
      <div style={{ color: '#eab308', fontSize: '1.25rem', letterSpacing: '0.1rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{star <= rating ? '★' : '☆'}</span>
        ))}
      </div>
    );
  };

  return (
    <div 
      onClick={resetModal} 
      style={{ position: 'fixed', inset: 0, background: 'rgba(30, 58, 138, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ background: 'white', borderRadius: '1.5rem', maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      >
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'black', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          Booking Details
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div><span style={{ color: '#64748b', display: 'block' }}>Date & Time</span><strong>{selectedBooking.booking_date} ({selectedBooking.booking_timeslot})</strong></div>
          <div><span style={{ color: '#64748b', display: 'block' }}>Total Amount</span><strong>{formatCurrency(selectedBooking.booking_total_amount)}</strong></div>
          <div><span style={{ color: '#64748b', display: 'block' }}>Status</span><strong style={{ textTransform: 'capitalize' }}>{formatStatus(selectedBooking.booking_status)}</strong></div>
          <div><span style={{ color: '#64748b', display: 'block' }}>Created At</span><strong>{new Date(selectedBooking.created_at).toLocaleString()}</strong></div>
        </div>

        {selectedBooking.booking_rejection_reason && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rejection Reason</p>
            <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>{selectedBooking.booking_rejection_reason}</p>
          </div>
        )}

        {selectedBooking.booking_comment && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#1e3a8a', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem' }}>Note to Pet Owner</p>
            <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedBooking.booking_comment}</p>
          </div>
        )}

        {/* UPDATED: Pet Owner Details Section rendering DB columns */}
        {selectedBooking.profiles && (
          <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#1e3a8a', textTransform: 'uppercase' }}>Pet Owner Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
              <p><strong>Name:</strong> {selectedBooking.profiles.first_name} {selectedBooking.profiles.last_name}</p>
              <p><strong>Username:</strong> {selectedBooking.profiles.username || 'N/A'}</p>
              <p><strong>Contact:</strong> {selectedBooking.profiles.mobile_number || 'N/A'}</p>
            </div>
          </div>
        )}

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

        {(selectedBooking.booking_overall_rating || selectedBooking.booking_review) && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 'bold', color: '#854d0e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Customer Feedback
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: selectedBooking.booking_review ? '1rem' : '0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a16207', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Overall Experience</span>
                {renderStars(selectedBooking.booking_overall_rating)}
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a16207', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Staff Performance</span>
                {renderStars(selectedBooking.booking_staff_rating)}
              </div>
            </div>

            {selectedBooking.booking_review && (
              <div style={{ borderTop: '1px solid #fde047', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#a16207', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Written Review</span>
                <p style={{ fontSize: '0.875rem', color: '#713f12', fontStyle: 'italic', margin: 0, lineHeight: '1.4' }}>
                  "{selectedBooking.booking_review}"
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          
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
                    <button onClick={handleReject} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Confirm Reject
                    </button>
                    <button onClick={() => { setShowRejectInput(false); setRejectionReason(''); }} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showApproveInput && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Note to Pet Owner (Optional):</label>
                  <textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="E.g., Please ensure your pet hasn't eaten 2 hours prior..."
                    style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: '1rem' }}
                    rows={3}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handleApprove} disabled={isUpdating} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', opacity: isUpdating ? 0.7 : 1 }}>
                      {isUpdating ? 'Saving...' : 'Confirm Approval'}
                    </button>
                    <button onClick={() => { setShowApproveInput(false); setApprovalNote(''); }} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showRejectInput && !showApproveInput && (
                <>
                  {isSuspended && (
                    <p style={{ color: '#b45309', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                      Your account is suspended, so you can&apos;t accept or reject booking requests until the suspension ends.
                    </p>
                  )}
                  <button disabled={isSuspended} onClick={() => setShowRejectInput(true)} style={{ padding: '0.75rem 1.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: isSuspended ? 'not-allowed' : 'pointer', opacity: isSuspended ? 0.5 : 1, fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    Reject Booking
                  </button>
                  <button disabled={isSuspended} onClick={() => setShowApproveInput(true)} style={{ padding: '0.75rem 1.5rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: isSuspended ? 'not-allowed' : 'pointer', opacity: isSuspended ? 0.5 : 1, fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    Approve Booking
                  </button>
                </>
              )}
            </>
          )}

          {(selectedBooking.booking_status === 'paid' || selectedBooking.booking_status === 'approved') && (
            <>
              {showCompleteInput ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Booking Outcome:</label>
                    <select
                      value={completionOutcome}
                      onChange={(e) => {
                        setCompletionOutcome(e.target.value as 'service_completed' | 'no_show');
                        setIsConfirmingNoShow(false);
                      }}
                      style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a' }}
                    >
                      <option value="service_completed">Service Successfully Completed</option>
                      <option value="no_show">Customer No-Show</option>
                    </select>
                  </div>

                  {completionOutcome === 'service_completed' && selectedBooking.booking_pet_info?.map(pet => (
                    <div key={pet.id} style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                        Assign Staff for: {pet.booking_pet_name} ({pet.booking_pet_type})
                      </p>
                      <select
                        value={petEmployeeAssignments[pet.id] || ''}
                        onChange={(e) => handleEmployeeSelection(pet.id, e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                      >
                        <option value="">-- Select an employee --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.employee_first_name} {emp.employee_last_name} ({emp.employee_position.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {completionOutcome === 'no_show' && (
                    <div style={{ padding: '0.75rem', background: '#fee2e2', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #fecaca' }}>
                      <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: 0, fontWeight: '600' }}>
                        Warning: Marking this as a No-Show will finalize the booking. The customer will not be able to rate the service.
                      </p>
                      
                      {isConfirmingNoShow && (
                        <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginTop: '0.5rem', fontWeight: 'bold' }}>
                          Are you sure you want to mark this booking as a Customer No-Show?
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button 
                      onClick={handleCompleteOrNoShow} 
                      disabled={isUpdating} 
                      style={{ flex: 1, padding: '0.75rem 1.5rem', background: completionOutcome === 'no_show' ? '#dc2626' : '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', opacity: isUpdating ? 0.7 : 1 }}
                    >
                      {isUpdating ? 'Saving...' : (completionOutcome === 'no_show' ? (isConfirmingNoShow ? 'Yes, Confirm No-Show' : 'Confirm No-Show') : 'Confirm Completion')}
                    </button>
                    <button 
                      onClick={() => { 
                        if (isConfirmingNoShow) {
                          setIsConfirmingNoShow(false);
                        } else {
                          setShowCompleteInput(false); 
                          setCompletionOutcome('service_completed'); 
                          setPetEmployeeAssignments({}); 
                        }
                      }} 
                      style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => setShowCompleteInput(true)} 
                    style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Mark as Completed
                  </button>
                  {/* Approved bookings are locked in: the provider can complete them but not cancel them */}
                  {selectedBooking.booking_status === 'paid' && (
                    <button 
                      onClick={handleCancelAndRefund} 
                      disabled={isRefunding}
                      style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', opacity: isRefunding ? 0.7 : 1 }}
                    >
                      {isRefunding ? 'Processing...' : 'Cancel & Refund'}
                    </button>
                  )}
                </div>
                {selectedBooking.booking_status === 'approved' && (
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.5rem 0 0', textAlign: 'center' }}>
                    This booking is approved and can no longer be cancelled.
                  </p>
                )}
                </>
              )}
            </>
          )}

          {selectedBooking.booking_status === 'to_refund' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#1e3a8a', textAlign: 'center', margin: 0 }}>
                  <strong>Manual Action Required:</strong> Ensure the refund has been successfully processed or manually sent to the customer (via GCash/Maya) before marking this as resolved.
                </p>
              </div>
              <button 
                onClick={() => handleUpdateStatus(selectedBooking.id, 'refunded')}
                style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}
              >
                Mark as Refunded
              </button>
            </div>
          )}

          <button onClick={resetModal} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}