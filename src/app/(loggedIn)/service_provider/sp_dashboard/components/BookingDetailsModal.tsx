import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Booking, BookingStatus } from '../type';
import { formatCurrency, formatStatus } from '../utils';

interface BookingDetailsModalProps {
  selectedBooking: Booking | null; // Make sure it formally accepts null
  setSelectedBooking: (booking: Booking | null) => void;
  handleUpdateStatus: (id: string, newStatus: BookingStatus, reason?: string) => void;
}

export default function BookingDetailsModal({ 
  selectedBooking, 
  setSelectedBooking, 
  handleUpdateStatus 
}: BookingDetailsModalProps) {
  
  // FAILSAFE: Instantly return nothing if selectedBooking somehow becomes null during transition
  if (!selectedBooking) return null;

  const supabase = createClientComponentClient();

  // Common UI State
  const [isUpdating, setIsUpdating] = useState(false);

  // Rejection State (For New Requests)
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Cancellation State (For Upcoming Bookings)
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

  // Approval Note State
  const [approvalNote, setApprovalNote] = useState('');
  const [showApproveInput, setShowApproveInput] = useState(false);

  // Employee Assignment State (Per Pet)
  const [employees, setEmployees] = useState<any[]>([]);
  const [petEmployeeAssignments, setPetEmployeeAssignments] = useState<Record<string, string>>({});
  const [showCompleteInput, setShowCompleteInput] = useState(false);

  // Fetch employees for approved or paid upcoming bookings
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

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    setIsUpdating(true);
    try {
      await handleUpdateStatus(selectedBooking.id, 'rejected', rejectionReason);
      setShowRejectInput(false);
      setRejectionReason('');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please enter a cancellation reason');
      return;
    }
    setIsUpdating(true);
    try {
      await handleUpdateStatus(selectedBooking.id, 'cancelled', cancelReason);
      setShowCancelInput(false);
      setCancelReason('');
    } finally {
      setIsUpdating(false);
    }
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
      }
      handleUpdateStatus(selectedBooking.id, 'approved');
    } catch (err: any) {
      alert('Failed to approve booking: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEmployeeSelection = (petId: string, employeeId: string) => {
    setPetEmployeeAssignments(prev => ({
      ...prev,
      [petId]: employeeId
    }));
  };

  const handleComplete = async () => {
    const pets = selectedBooking.booking_pet_info || [];
    const missingAssignments = pets.some((pet: any) => !petEmployeeAssignments[pet.id]);
    
    if (missingAssignments) {
      alert('Please assign an employee for every pet in this booking.');
      return;
    }

    setIsUpdating(true);
    try {
      const updatePromises = pets.map((pet: any) => 
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

  const resetModal = () => {
    setSelectedBooking(null);
    setShowRejectInput(false);
    setShowCancelInput(false);
    setShowApproveInput(false);
    setShowCompleteInput(false);
    setRejectionReason('');
    setCancelReason('');
    setApprovalNote('');
    setPetEmployeeAssignments({});
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

        {/* Rejection / Cancellation Reason */}
        {(selectedBooking.booking_rejection_reason || selectedBooking.refund_reason) && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reason Provided</p>
            <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
              {selectedBooking.refund_reason || selectedBooking.booking_rejection_reason}
            </p>
          </div>
        )}

        {/* Pets & Services Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>Pet(s) & Services</h4>
          {selectedBooking.booking_pet_info && selectedBooking.booking_pet_info.length > 0 ? (
            selectedBooking.booking_pet_info.map((pet: any) => (
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
                      {pet.booking_service_info.map((srv: any) => (
                        <li key={srv.id}>{srv.booking_service_name} - {formatCurrency(srv.booking_price)}</li>
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
              {showRejectInput ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <strong>Note:</strong> Rejecting this request will automatically initiate a <strong>100% refund</strong> back to the pet owner.
                  </div>
                  
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Rejection Reason:</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                    rows={3}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button onClick={handleReject} disabled={isUpdating} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', opacity: isUpdating ? 0.7 : 1 }}>
                      {isUpdating ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                    <button onClick={() => { setShowRejectInput(false); setRejectionReason(''); }} disabled={isUpdating} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Back
                    </button>
                  </div>
                </div>
              ) : showApproveInput ? (
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
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setShowRejectInput(true)} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    Reject Request
                  </button>
                  <button onClick={() => setShowApproveInput(true)} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    Approve Request
                  </button>
                </div>
              )}
            </>
          )}

          {(selectedBooking.booking_status === 'paid' || selectedBooking.booking_status === 'approved') && (
            <>
              {showCancelInput ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  {(selectedBooking.booking_status === 'paid' || selectedBooking.booking_status === 'approved') && (
                    <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <strong>Note:</strong> Cancelling this paid booking will automatically initiate a <strong>100% refund</strong> back to the pet owner.
                    </div>
                  )}
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Cancellation Reason:</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason for cancelling..."
                    style={{ width: '100%', padding: '0.75rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                    rows={3}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button onClick={handleCancel} disabled={isUpdating} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', opacity: isUpdating ? 0.7 : 1 }}>
                      {isUpdating ? 'Processing...' : 'Confirm Cancel'}
                    </button>
                    <button onClick={() => { setShowCancelInput(false); setCancelReason(''); }} disabled={isUpdating} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Back
                    </button>
                  </div>
                </div>
              ) : showCompleteInput ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>Assign Staff / Employee per Pet:</label>
                  
                  {selectedBooking.booking_pet_info?.map((pet: any) => (
                    <div key={pet.id} style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                        {pet.booking_pet_name} ({pet.booking_pet_type})
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
                  
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button onClick={handleComplete} disabled={isUpdating} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', opacity: isUpdating ? 0.7 : 1 }}>
                      {isUpdating ? 'Saving...' : 'Confirm Completion'}
                    </button>
                    <button onClick={() => { setShowCompleteInput(false); setPetEmployeeAssignments({}); }} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setShowCancelInput(true)} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    {(selectedBooking.booking_status === 'paid' || selectedBooking.booking_status === 'approved') ? 'Cancel & Refund' : 'Cancel Booking'}
                  </button>
                  <button onClick={() => setShowCompleteInput(true)} style={{ flex: 1, padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}>
                    Mark as Completed
                  </button>
                </div>
              )}
            </>
          )}

          <button onClick={resetModal} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.2s' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}