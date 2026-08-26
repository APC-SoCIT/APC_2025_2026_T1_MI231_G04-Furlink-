'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';
import {
  FaClock,
  FaCreditCard,
  FaCut,
  FaTimesCircle,
  FaUndo,
  FaCheckCircle,
  FaCalendarAlt,
  FaHistory,
  FaCalendarTimes,
  FaTimes,
  FaFileAlt,
  FaExclamationCircle,
} from 'react-icons/fa';
import './manage_bookings.css';

type BookingTab =
  | 'awaiting_approval'
  | 'to_pay'
  | 'upcoming'
  | 'decline_cancelled'
  | 'refund'
  | 'completed';

type ServiceItem = {
  id: string;
  booking_service_name: string;
  booking_price: number;
};

type PetInfoItem = {
  id: string;
  booking_pet_name: string;
  booking_pet_type: string;
  booking_breed: string;
  booking_gender: string;
  booking_date_of_birth: string;
  booking_weight: number;
  booking_calculated_size: string;
  booking_behavior: string[];
  booking_emergency_consent: boolean;
  booking_grooming_notes: string | null;
  booking_service_info?: ServiceItem[];
};

type BookingRecord = {
  id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  booking_rejection_reason?: string | null;
  booking_total_amount: number;
  booking_pet_info?: PetInfoItem[];
};

export default function ManageBookingsPage() {
  const supabase = createClientComponentClient();

  const [activeTab, setActiveTab] = useState<BookingTab>('awaiting_approval');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Details Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  // Mapped to exact status strings allowed by database constraints
  const getStatusesForTab = (tab: BookingTab): string[] => {
    switch (tab) {
      case 'awaiting_approval':
        return ['pending_sp_response'];
      case 'to_pay':
        return ['to pay'];
      case 'upcoming':
        return ['approved', 'paid'];
      case 'decline_cancelled':
        return ['rejected', 'cancelled'];
      case 'refund':
        return ['to_refund', 'refunded'];
      case 'completed':
        return ['to_rate', 'rated', 'completed'];
      default:
        return [];
    }
  };

  useEffect(() => {
    const processAutoTransitionsAndFetch = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const now = new Date();
        const nowTime = now.getTime();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        // Fetch active candidates for potential auto-transition
        const { data: candidates } = await supabase
          .from('booking_info')
          .select('id, booking_date, booking_timeslot, booking_status')
          .eq('profiles_id', user.id)
          .in('booking_status', ['pending_sp_response', 'to pay']);

        if (candidates && candidates.length > 0) {
          for (const b of candidates) {
            const [year, month, day] = b.booking_date.split('-').map(Number);
            let hours = 9;
            let minutes = 0;

            if (b.booking_timeslot) {
              const parts = b.booking_timeslot.split(' ');
              if (parts.length === 2) {
                const [hStr, mStr] = parts[0].split(':');
                hours = parseInt(hStr, 10);
                minutes = parseInt(mStr, 10) || 0;
                if (parts[1].toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (parts[1].toUpperCase() === 'AM' && hours === 12) hours = 0;
              }
            }

            const bookingDateTime = new Date(year, month - 1, day, hours, minutes);
            const bookingTimeMs = bookingDateTime.getTime();

            // Rule 1: Awaiting approval within 24h of appointment -> Move to 'to_refund'
            if (
              b.booking_status === 'pending_sp_response' &&
              bookingTimeMs - nowTime <= TWENTY_FOUR_HOURS_MS
            ) {
              await supabase
                .from('booking_info')
                .update({
                  booking_status: 'to_refund',
                  booking_rejection_reason:
                    'System Auto-Refund: Provider did not approve within 24 hours of scheduled appointment',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', b.id);
            }

            // Rule 2: Unpaid 'to pay' past scheduled booking date -> Move to 'cancelled'
            const todayDateStr = now.toISOString().split('T')[0];
            if (b.booking_status === 'to pay' && b.booking_date < todayDateStr) {
              await supabase
                .from('booking_info')
                .update({
                  booking_status: 'cancelled',
                  booking_rejection_reason:
                    'System Auto-Cancelled: Payment deadline passed before scheduled booking date',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', b.id);
            }
          }
        }

        // Fetch bookings corresponding to active tab
        const targetStatuses = getStatusesForTab(activeTab);

        const { data, error } = await supabase
          .from('booking_info')
          .select(`
            id,
            booking_date,
            booking_timeslot,
            booking_status,
            booking_rejection_reason,
            booking_total_amount,
            booking_pet_info (
              id,
              booking_pet_name,
              booking_pet_type,
              booking_breed,
              booking_gender,
              booking_date_of_birth,
              booking_weight,
              booking_calculated_size,
              booking_behavior,
              booking_emergency_consent,
              booking_grooming_notes,
              booking_service_info (
                id,
                booking_service_name,
                booking_price
              )
            )
          `)
          .eq('profiles_id', user.id)
          .in('booking_status', targetStatuses)
          .order('booking_date', { ascending: true });

        if (!error && data) {
          setBookings(data as unknown as BookingRecord[]);
        } else {
          console.error('Error fetching bookings:', error);
          setBookings([]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    processAutoTransitionsAndFetch();
  }, [activeTab, supabase]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }

    return timeStr;
  };

  const formatStatusLabel = (status: string) => {
    if (status === 'to_refund') return 'TO REFUND';
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const getStatusCssClass = (status: string) => {
    return status.replace(/\s+/g, '-').toLowerCase();
  };

  const handleOpenDetails = (booking: BookingRecord) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleReschedulePlaceholder = () => {
    alert('Reschedule request functionality will be implemented soon.');
  };

  return (
    <div className="manage-bookings-container">
      <main className="manage-bookings-main">
        {/* Header Section */}
        <div className="manage-bookings-header">
          <div>
            <h1 className="bookings-title">My Appointments</h1>
            <p className="bookings-subtitle">Manage your pet's grooming sessions</p>
          </div>
          <div className="header-action-btns">
            <button className="outline-header-btn">
              <FaCalendarAlt className="btn-icon" /> View Calendar
            </button>
            <button className="outline-header-btn">
              <FaHistory className="btn-icon" /> View History
            </button>
          </div>
        </div>

        {/* 6 Category Tabs Grid */}
        <div className="booking-tabs-grid six-categories">
          <button
            className={`tab-card ${activeTab === 'awaiting_approval' ? 'active' : ''}`}
            onClick={() => setActiveTab('awaiting_approval')}
          >
            <div className="tab-icon-circle"><FaClock /></div>
            <span className="tab-label">Awaiting Approval</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'to_pay' ? 'active' : ''}`}
            onClick={() => setActiveTab('to_pay')}
          >
            <div className="tab-icon-circle"><FaCreditCard /></div>
            <span className="tab-label">To Pay</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <div className="tab-icon-circle"><FaCut /></div>
            <span className="tab-label">Upcoming</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'decline_cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('decline_cancelled')}
          >
            <div className="tab-icon-circle"><FaTimesCircle /></div>
            <span className="tab-label">Decline/Cancelled</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'refund' ? 'active' : ''}`}
            onClick={() => setActiveTab('refund')}
          >
            <div className="tab-icon-circle"><FaUndo /></div>
            <span className="tab-label">Refund</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <div className="tab-icon-circle"><FaCheckCircle /></div>
            <span className="tab-label">Completed</span>
          </button>
        </div>

        {/* Appointments Table Section */}
        <div className="appointments-table-card">
          <div className="table-header-row">
            <div className="col-cell col-date">DATE & TIME</div>
            <div className="col-cell col-pets">NO. OF PETS</div>
            <div className="col-cell col-service">SERVICE</div>
            <div className="col-cell col-status">STATUS</div>
            <div className="col-cell col-total">TOTAL</div>
            <div className="col-cell col-action">ACTION</div>
          </div>

          {loading ? (
            <div className="table-loading-box">
              <p>Loading appointments...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="table-empty-box">
              <FaCalendarTimes className="empty-calendar-icon" />
              <h3 className="empty-title">No appointments found.</h3>
              <p className="empty-subtitle">There are no bookings matching this category status.</p>
            </div>
          ) : (
            <div className="table-body-rows">
              {bookings.map((item) => {
                const petsCount = item.booking_pet_info?.length || 0;
                const allServiceNames = Array.from(
                  new Set(
                    item.booking_pet_info?.flatMap(
                      (p) => p.booking_service_info?.map((s) => s.booking_service_name) || []
                    ) || []
                  )
                );

                return (
                  <div key={item.id} className="table-data-row">
                    <div className="col-cell col-date font-bold">
                      {formatDateDisplay(item.booking_date)}
                      <span className="timeslot-subtext">
                        {formatTimeDisplay(item.booking_timeslot)}
                      </span>
                    </div>

                    <div className="col-cell col-pets">
                      {petsCount} {petsCount === 1 ? 'Pet' : 'Pets'}
                    </div>

                    <div className="col-cell col-service">
                      {allServiceNames.length > 0 ? allServiceNames.join(', ') : 'Grooming Service'}
                    </div>

                    <div className="col-cell col-status">
                      <span className={`status-pill ${getStatusCssClass(item.booking_status)}`}>
                        {formatStatusLabel(item.booking_status)}
                      </span>
                    </div>

                    <div className="col-cell col-total font-bold">
                      ₱{Number(item.booking_total_amount || 0).toFixed(2)}
                    </div>

                    <div className="col-cell col-action">
                      <button
                        className="row-action-btn secondary"
                        onClick={() => handleOpenDetails(item)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="modal-backdrop">
          <div className="summary-modal-card">
            <div className="summary-modal-header">
              <div className="modal-header-title">
                <FaFileAlt className="header-doc-icon" />
                <h2>Booking Details</h2>
              </div>
              <button className="modal-close-x" onClick={() => setShowDetailsModal(false)}>
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

              {selectedBooking.booking_rejection_reason && (
                <div className="rejection-reason-box">
                  <strong>Cancellation/Refund Reason:</strong> {selectedBooking.booking_rejection_reason}
                </div>
              )}

              {selectedBooking.booking_pet_info?.map((pet, pIdx) => {
                const petTotal =
                  pet.booking_service_info?.reduce(
                    (sum, s) => sum + Number(s.booking_price || 0),
                    0
                  ) || 0;

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
                      <div>Type: <strong>{pet.booking_pet_type?.toUpperCase()}</strong></div>
                      <div>Breed: <strong>{pet.booking_breed || 'N/A'}</strong></div>
                      <div>Gender: <strong>{pet.booking_gender?.toUpperCase()}</strong></div>
                      <div>Birth Date: <strong>{pet.booking_date_of_birth || 'N/A'}</strong></div>
                      <div>Weight: <strong>{pet.booking_weight ? `${pet.booking_weight} kg` : 'N/A'}</strong></div>
                      <div>Size: <strong>{pet.booking_calculated_size?.toUpperCase()}</strong></div>
                    </div>

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
                      {pet.booking_behavior && pet.booking_behavior.length > 0
                        ? pet.booking_behavior.join(' / ')
                        : 'None specified'}
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
                  <span className="amount-bold">
                    ₱{Number(selectedBooking.booking_total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="summary-modal-footer">
              <button className="btn-reschedule-booking" onClick={handleReschedulePlaceholder}>
                Reschedule
              </button>
              <button className="btn-close-modal" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}