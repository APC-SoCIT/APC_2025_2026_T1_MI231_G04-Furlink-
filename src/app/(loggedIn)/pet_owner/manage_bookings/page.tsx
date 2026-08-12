'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';
import {
  FaClock,
  FaCreditCard,
  FaCut,
  FaStar,
  FaCalendarAlt,
  FaHistory,
  FaCalendarTimes,
  FaTimes,
  FaFileAlt,
  FaExclamationCircle,
} from 'react-icons/fa';
import './manage_bookings.css';

type BookingTab = 'awaiting_approval' | 'for_payment' | 'upcoming' | 'to_rate';

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

  // Map frontend tabs to backend status strings
  const getStatusesForTab = (tab: BookingTab): string[] => {
    switch (tab) {
      case 'awaiting_approval':
        return ['pending_sp_response', 'pending', 'awaiting_approval'];
      case 'for_payment':
        return ['approved_pending_payment', 'for_payment', 'unpaid'];
      case 'upcoming':
        return ['confirmed', 'paid', 'upcoming', 'in_progress'];
      case 'to_rate':
        return ['completed', 'to_rate'];
      default:
        return [];
    }
  };

  useEffect(() => {
    const fetchUserBookings = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const targetStatuses = getStatusesForTab(activeTab);

        const { data, error } = await supabase
          .from('booking_info')
          .select(`
            id,
            booking_date,
            booking_timeslot,
            booking_status,
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

    fetchUserBookings();
  }, [activeTab, supabase]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Standardize 24-hour SQL strings ("09:00:00") and 12-hour strings ("9:00 AM")
  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';

    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }

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
        {/* Page Title & Controls Header */}
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

        {/* Tab Selection Cards */}
        <div className="booking-tabs-grid">
          <button
            className={`tab-card ${activeTab === 'awaiting_approval' ? 'active' : ''}`}
            onClick={() => setActiveTab('awaiting_approval')}
          >
            <div className="tab-icon-circle">
              <FaClock />
            </div>
            <span className="tab-label">Awaiting Approval</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'for_payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('for_payment')}
          >
            <div className="tab-icon-circle">
              <FaCreditCard />
            </div>
            <span className="tab-label">For Payment</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <div className="tab-icon-circle">
              <FaCut />
            </div>
            <span className="tab-label">Upcoming</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'to_rate' ? 'active' : ''}`}
            onClick={() => setActiveTab('to_rate')}
          >
            <div className="tab-icon-circle">
              <FaStar />
            </div>
            <span className="tab-label">To Rate</span>
          </button>
        </div>

        {/* Appointments Table Section */}
        <div className="appointments-table-card">
          <div className="table-header-row">
            <div className="col-cell col-date">DATE & TIME</div>
            <div className="col-cell col-pets">NO. OF PETS</div>
            <div className="col-cell col-service">SERVICE</div>
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
              <p className="empty-subtitle">Try checking a different tab or date range.</p>
            </div>
          ) : (
            <div className="table-body-rows">
              {bookings.map((item) => {
                const petsCount = item.booking_pet_info?.length || 0;

                // Collect unique service names across all pets
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
                      {allServiceNames.length > 0
                        ? allServiceNames.join(', ')
                        : 'Grooming Service'}
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

      {/* BOOKING DETAILS SUMMARY MODAL */}
      {showDetailsModal && selectedBooking && (
        <div className="modal-backdrop">
          <div className="summary-modal-card">
            <div className="summary-modal-header">
              <div className="modal-header-title">
                <FaFileAlt className="header-doc-icon" />
                <h2>Booking Details</h2>
              </div>
              <button
                className="modal-close-x"
                onClick={() => setShowDetailsModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="summary-modal-body">
              {/* Schedule Header Banner */}
              <div className="details-schedule-banner">
                <FaCalendarAlt className="schedule-banner-icon" />
                <div>
                  <strong>{formatDateDisplay(selectedBooking.booking_date)}</strong>
                  <span> at {formatTimeDisplay(selectedBooking.booking_timeslot)}</span>
                </div>
              </div>

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

                    {/* Availed Services */}
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

                    {/* Grooming Notes */}
                    {pet.booking_grooming_notes && (
                      <div className="summary-grooming-notes">
                        <strong>Grooming Notes:</strong> {pet.booking_grooming_notes}
                      </div>
                    )}

                    {/* Behaviors */}
                    <div className="summary-behaviors">
                      Behaviors:{' '}
                      {pet.booking_behavior && pet.booking_behavior.length > 0
                        ? pet.booking_behavior.join(' / ')
                        : 'None specified'}
                    </div>

                    {/* Emergency Consent Status */}
                    <div
                      className={`summary-consent-badge ${
                        pet.booking_emergency_consent ? 'approved' : 'declined'
                      }`}
                    >
                      <FaExclamationCircle />
                      <span>
                        Emergency Transport Consent:{' '}
                        {pet.booking_emergency_consent ? 'APPROVED' : 'DECLINED'}
                      </span>
                    </div>
                  </div>
                );
              })}

              <hr className="summary-divider" />

              {/* Total Financials Display */}
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
              <button
                className="btn-reschedule-booking"
                onClick={handleReschedulePlaceholder}
              >
                Reschedule
              </button>
              <button
                className="btn-close-modal"
                onClick={() => setShowDetailsModal(false)}
              >
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