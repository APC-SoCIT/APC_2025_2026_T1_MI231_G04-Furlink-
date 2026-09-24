'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-icons/fa';
import './manage_bookings.css';

import { BookingTab, BookingRecord } from './types/booking';
import {
  formatDateDisplay,
  formatTimeDisplay,
  formatStatusLabel,
  getStatusCssClass,
} from './utils/bookingFormatters';
import BookingDetailsModal from './modals/BookingDetailsModal';
import RescheduleModal from './modals/RescheduleModal';
import PaymentSuccessModal from './modals/PaymentSuccessModal';
import PaymentFailedModal from './modals/PaymentFailedModal'; // Import the failed modal

export default function ManageBookingsPage() {
  const supabase = createClientComponentClient();

  const [activeTab, setActiveTab] = useState<BookingTab>('awaiting_approval');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal statess
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false); // Failed modal visibility

  // Payment attempts & cooldown tracking states
  const [paymentAttempts, setPaymentAttempts] = useState<number>(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isSavingPayLater, setIsSavingPayLater] = useState<boolean>(false);
  const [failedBookingId, setFailedBookingId] = useState<string | null>(null);

  // Load attempt limits & cooldowns from localStorage on mount
  useEffect(() => {
    const savedAttempts = localStorage.getItem('payment_attempts');
    const savedCooldown = localStorage.getItem('payment_cooldown_until');
    
    if (savedAttempts) setPaymentAttempts(parseInt(savedAttempts, 10));
    if (savedCooldown) {
      const cooldownTime = parseInt(savedCooldown, 10);
      if (Date.now() < cooldownTime) {
        setCooldownUntil(cooldownTime);
      } else {
        localStorage.removeItem('payment_cooldown_until');
        localStorage.setItem('payment_attempts', '0');
        setPaymentAttempts(0);
      }
    }
  }, []);

  // Cooldown countdown interval ticker
  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = setInterval(() => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownUntil(null);
        setPaymentAttempts(0);
        localStorage.removeItem('payment_cooldown_until');
        localStorage.setItem('payment_attempts', '0');
        clearInterval(interval);
      } else {
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Mapped to exact status strings allowed by database constraints
  const getStatusesForTab = (tab: BookingTab): string[] => {
    switch (tab) {
      case 'awaiting_approval':
        return ['pending_sp_response'];
      case 'to_pay':
        return ['to pay'];
      case 'upcoming':
        return ['approved'];
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

  const fetchBookings = useCallback(async () => {
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
          booking_comment,
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
            booking_ai_haircut_url,
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
  }, [activeTab, supabase]);

  // Handle successful or failed PayMongo redirection callbacks via URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const status = queryParams.get('status');
    const bookingId = queryParams.get('booking_id');

    if (bookingId) {
      setFailedBookingId(bookingId);
    }

    if (status === 'success' && bookingId) {
      const verifyAndStorePayment = async () => {
        try {
          const response = await fetch(`/api/paymongo/verify?booking_id=${bookingId}`);
          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to verify payment session.');
          }

          setShowSuccessModal(true);
          localStorage.setItem('payment_attempts', '0');
          setPaymentAttempts(0);

          window.history.replaceState({}, document.title, window.location.pathname);
          setActiveTab('awaiting_approval');
          fetchBookings();
        } catch (err: any) {
          console.error('Payment verification error:', err);
          alert(`Error saving payment record: ${err.message || 'Unknown error'}`);
        }
      };

      verifyAndStorePayment();
    } else if ((status === 'failed' || status === 'cancelled') && bookingId) {
      // Just show the failed modal; the attempt count was already incremented when clicking "Try Again"
      setShowFailedModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchBookings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleOpenDetails = (booking: BookingRecord) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleReschedule = async (newDate: string, newTimeslot: string) => {
    if (!selectedBooking) return;

    try {
      const { error } = await supabase
        .from('booking_info')
        .update({
          booking_date: newDate,
          booking_timeslot: newTimeslot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id);

      if (error) {
        console.error('Error rescheduling booking:', error);
        alert('Failed to reschedule booking. Please try again.');
        return;
      }

      alert('Booking successfully rescheduled!');
      setShowRescheduleModal(false);
      fetchBookings();
    } catch (err) {
      console.error('Unexpected error during rescheduling:', err);
    }
  };

  const handlePayNow = async (bookingId?: string) => {
    if (cooldownUntil && Date.now() < cooldownUntil) {
      alert('Payment attempts are temporarily locked due to multiple failed tries. Please wait for the cooldown or choose Pay Later.');
      return;
    }

    const targetBookingId = bookingId || failedBookingId || selectedBooking?.id;

    if (!targetBookingId) {
      alert('Error: Could not identify the booking for payment. Please select "View Details" and try paying from there.');
      return;
    }

    // Increment attempt count immediately upon initiating a payment attempt
    const newAttempts = paymentAttempts + 1;
    setPaymentAttempts(newAttempts);
    localStorage.setItem('payment_attempts', newAttempts.toString());

    if (newAttempts >= 3) {
      const cooldownTime = Date.now() + 60 * 60 * 1000; // 1-hour cooldown limit
      setCooldownUntil(cooldownTime);
      localStorage.setItem('payment_cooldown_until', cooldownTime.toString());
      setShowFailedModal(true);
      return;
    }

    try {
      let bookingToPay =
        bookings.find((b) => b.id === targetBookingId) ||
        (selectedBooking?.id === targetBookingId ? selectedBooking : null);

      let amount = bookingToPay ? Number(bookingToPay.booking_total_amount || 0) : 0;

      // Fallback: Fetch directly from Supabase if amount isn't in current state view
      if (amount <= 0) {
        const { data: fetchedBooking, error: fetchError } = await supabase
          .from('booking_info')
          .select('booking_total_amount')
          .eq('id', targetBookingId)
          .single();

        if (!fetchError && fetchedBooking) {
          amount = Number(fetchedBooking.booking_total_amount || 0);
        }
      }

      if (amount <= 0) {
        alert('Error: Invalid total amount for this booking.');
        return;
      }

      const response = await fetch('/api/paymongo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: targetBookingId,
          amount: amount,
          description: `Pet Grooming Session Payment`,
          isPayNow: true, 
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || 'Failed to initialize payment session.');
      }

      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      console.error('PayNow error:', err);
      alert(`Error: ${err.message || 'Could not redirect to payment.'}`);
    }
  };

  const handlePayLater = async () => {
    if (!failedBookingId) {
      setShowFailedModal(false);
      return;
    }

    setIsSavingPayLater(true);
    try {
      const { error } = await supabase
        .from('booking_info')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', failedBookingId);

      if (error) throw error;

      setShowFailedModal(false);
      setActiveTab('to_pay');
      fetchBookings();
    } catch (err: any) {
      console.error('Error saving pay later:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setIsSavingPayLater(false);
    }
  };

  const handleRequestRefund = (bookingId: string) => {
    alert(`Initiating refund request for booking ID: ${bookingId}`);
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

      {/* Payment Success Confirmation Modal */}
      {showSuccessModal && (
        <PaymentSuccessModal onClose={() => setShowSuccessModal(false)} />
      )}

      {/* Payment Failed / Cancelled Modal with Limits */}
      {showFailedModal && (
        <PaymentFailedModal
          cooldownUntil={cooldownUntil}
          timeRemaining={timeRemaining}
          paymentAttempts={paymentAttempts}
          isSavingPayLater={isSavingPayLater}
          onRetry={() => {
            setShowFailedModal(false);
            handlePayNow(failedBookingId || undefined);
          }}
          onPayLater={handlePayLater}
        />
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <BookingDetailsModal
          selectedBooking={selectedBooking}
          activeTab={activeTab}
          onClose={() => setShowDetailsModal(false)}
          onPayNow={handlePayNow}
          onRequestRefund={handleRequestRefund}
          onReschedule={() => {
            setShowDetailsModal(false);
            setShowRescheduleModal(true);
          }}
        />
      )}

      {/* Reschedule Picker Modal */}
      {showRescheduleModal && selectedBooking && (
        <RescheduleModal
          bookingId={selectedBooking.id}
          currentDate={selectedBooking.booking_date}
          currentTimeslot={selectedBooking.booking_timeslot}
          onClose={() => setShowRescheduleModal(false)}
          onSubmit={(newDate, newTimeslot) => {
            handleReschedule(newDate, newTimeslot);
          }}
        />
      )}

      <Footer />
    </div>
  );
}