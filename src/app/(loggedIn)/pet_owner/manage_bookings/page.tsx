'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';
import {
  FaClock,
  FaCreditCard,
  FaCut,
  FaTimesCircle,
  FaUndo,
  FaCheckCircle,
  FaCalendarTimes,
} from 'react-icons/fa';
import './manage_bookings.css';
import './tab_counters.css';

import { BookingTab, BookingRecord, SortOrder, StatusFilter } from './types/booking';
import {
  formatDateDisplay,
  formatTimeDisplay,
  formatStatusLabel,
  getStatusCssClass,
  getBookingStartDate,
  sortByBookingStart,
} from './utils/bookingFormatters';
import BookingDetailsModal from './modals/BookingDetailsModal';
import RescheduleModal from './modals/RescheduleModal';
import PaymentSuccessModal from './modals/PaymentSuccessModal';
import PaymentFailedModal from './modals/PaymentFailedModal';
import SubmitRatingModal from './modals/SubmitRatingModal';
import CancelBookingModal from './modals/CancelBookingModal';
import {
  getPaymentAttemptState,
  recordPaymentAttempt,
  clearPaymentAttempts,
} from '@/lib/paymentAttempts';

// Unpaid ('to pay') bookings are auto-cancelled once less than this long remains before the booking start
const UNPAID_AUTO_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function ManageBookingsPage() {
  const supabase = createClientComponentClient();

  const [activeTab, setActiveTab] = useState<BookingTab>('awaiting_approval');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Number of bookings in each category (shown as a badge on the tab icons)
  const [tabCounts, setTabCounts] = useState<Record<BookingTab, number>>({
    awaiting_approval: 0,
    to_pay: 0,
    upcoming: 0,
    cancelled: 0,
    refund: 0,
    completed: 0,
  });

  // List filters (apply to the active category)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false);
  
  // Rating Modal States
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingBooking, setRatingBooking] = useState<BookingRecord | null>(null);

  // Cancel Booking Modal States
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Payment attempts & cooldown tracking states
  const [paymentAttempts, setPaymentAttempts] = useState<number>(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isSavingPayLater, setIsSavingPayLater] = useState<boolean>(false);
  const [failedBookingId, setFailedBookingId] = useState<string | null>(null);

  // Attempts and cooldown belong to ONE booking: the one being paid / that just failed.
  const paymentBookingId = failedBookingId || selectedBooking?.id || null;

  useEffect(() => {
    const state = getPaymentAttemptState(paymentBookingId);
    setPaymentAttempts(state.attempts);
    setCooldownUntil(state.cooldownUntil);
    setTimeRemaining('');
  }, [paymentBookingId]);

  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = setInterval(() => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        // Reading the store also clears this booking's expired entry
        const state = getPaymentAttemptState(paymentBookingId);
        setCooldownUntil(state.cooldownUntil);
        setPaymentAttempts(state.attempts);
        clearInterval(interval);
      } else {
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil, paymentBookingId]);

  const getStatusesForTab = (tab: BookingTab): string[] => {
    switch (tab) {
      case 'awaiting_approval':
        return ['pending_sp_response'];
      case 'to_pay':
        return ['to pay'];
      case 'upcoming':
        return ['approved'];
      case 'cancelled':
        return ['rejected', 'cancelled', 'cancelled_by_po'];
      case 'refund':
        // Added 'processing' so it routes to the refund tab immediately after cancelling
        return ['processing', 'to_refund', 'refunded'];
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

      // Rule: Unpaid 'to pay' bookings that are less than 24 hours away (or already past) -> Move to 'cancelled'
      // Note: The 24-hr refund logic for PAID bookings is still handled by the backend Cron Job.
      const { data: unpaidCandidates } = await supabase
        .from('booking_info')
        .select('id, booking_date, booking_timeslot')
        .eq('profiles_id', user.id)
        .eq('booking_status', 'to pay');

      const overdueIds = (unpaidCandidates || [])
        .filter(
          (b) =>
            getBookingStartDate(b.booking_date, b.booking_timeslot).getTime() - Date.now() <
            UNPAID_AUTO_CANCEL_WINDOW_MS
        )
        .map((b) => b.id);

      if (overdueIds.length > 0) {
        await supabase
          .from('booking_info')
          .update({
            booking_status: 'cancelled',
            cancelled_by: 'system',
            booking_rejection_reason:
              'System Auto-Cancelled: Payment was not completed at least 24 hours before the scheduled booking',
            updated_at: new Date().toISOString(),
          })
          .in('id', overdueIds);
      }

      // Count the user's bookings per category (runs after the auto-cancel above so it is accurate)
      const { data: statusRows } = await supabase
        .from('booking_info')
        .select('booking_status')
        .eq('profiles_id', user.id);

      const counts: Record<BookingTab, number> = {
        awaiting_approval: 0,
        to_pay: 0,
        upcoming: 0,
        cancelled: 0,
        refund: 0,
        completed: 0,
      };
      const allTabs = Object.keys(counts) as BookingTab[];
      (statusRows || []).forEach((row: { booking_status: string }) => {
        const tab = allTabs.find((t) => getStatusesForTab(t).includes(row.booking_status));
        if (tab) counts[tab] += 1;
      });
      setTabCounts(counts);

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
          booking_review,
          booking_overall_rating,
          booking_staff_rating,
          booking_total_amount,
          refund_amount,
          sp_general_info (
            business_name
          ),
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
        .in('booking_status', targetStatuses);

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

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const status = queryParams.get('status');
    const bookingId = queryParams.get('booking_id');
    const tabParam = queryParams.get('tab');

    // e.g. /pet_owner/manage_bookings?tab=to_pay opens straight on that category
    const VALID_TABS: BookingTab[] = ['awaiting_approval', 'to_pay', 'upcoming', 'cancelled', 'refund', 'completed'];
    if (tabParam && (VALID_TABS as string[]).includes(tabParam)) {
      setActiveTab(tabParam as BookingTab);
      if (!status) window.history.replaceState({}, document.title, window.location.pathname);
    }

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
          clearPaymentAttempts(bookingId);
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
      setShowFailedModal(true);
      setActiveTab('to_pay'); // an unpaid booking lives in the To Pay category
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchBookings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Each category has its own statuses, so the status filter starts over when switching tabs
  useEffect(() => {
    setStatusFilter('all');
  }, [activeTab]);

  // Statuses of the active category (the status filter is only useful when there is more than one)
  const tabStatuses = getStatusesForTab(activeTab);

  // Apply the status filter, then order by booking date/time
  const visibleBookings = useMemo(
    () =>
      sortByBookingStart(
        bookings.filter((b) => statusFilter === 'all' || b.booking_status === statusFilter),
        sortOrder
      ),
    [bookings, statusFilter, sortOrder]
  );

  const handleOpenDetails = (booking: BookingRecord) => {
    // Payment limits follow the booking being viewed, not a previously failed one
    setFailedBookingId(null);
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleOpenRatingModal = (booking: BookingRecord) => {
    setRatingBooking(booking);
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (overallRating: number, staffRating: number, comment: string) => {
    if (!ratingBooking) return;

    const { error } = await supabase
      .from('booking_info')
      .update({
        booking_overall_rating: overallRating,
        booking_staff_rating: staffRating,
        booking_review: comment || null,
        booking_status: 'rated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ratingBooking.id);

    if (error) {
      throw new Error(error.message);
    }

    setShowRatingModal(false);
    setRatingBooking(null);
    fetchBookings();
  };

  // RescheduleModal already persists the new date/timeslot; just close and refresh.
  const handleReschedule = async (_newDate: string, _newTimeslot: string) => {
    setShowRescheduleModal(false);
    fetchBookings();
  };

  const handlePayNow = async (bookingId?: string) => {
    const targetBookingId = bookingId || failedBookingId || selectedBooking?.id;

    if (!targetBookingId) {
      alert('Error: Could not identify the booking for payment. Please select "View Details" and try paying from there.');
      return;
    }

    // Limits are per booking: only THIS booking's attempts / cooldown matter
    const bookingState = getPaymentAttemptState(targetBookingId);
    if (bookingState.cooldownUntil && Date.now() < bookingState.cooldownUntil) {
      const remainingMs = bookingState.cooldownUntil - Date.now();
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);

      setFailedBookingId(targetBookingId);
      setCooldownUntil(bookingState.cooldownUntil);
      setPaymentAttempts(bookingState.attempts);
      setTimeRemaining(`${mins}m ${secs}s`);
      setShowDetailsModal(false);
      setShowFailedModal(true); // locked state of the modal explains the cooldown / Pay Later
      return;
    }

    try {
      let bookingToPay =
        bookings.find((b) => b.id === targetBookingId) ||
        (selectedBooking?.id === targetBookingId ? selectedBooking : null);

      let amount = bookingToPay ? Number(bookingToPay.booking_total_amount || 0) : 0;

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

      // Count the attempt only now that PayMongo is really being opened. The limit is
      // reached after the 3rd redirect; the 4th click is the one that gets blocked.
      const updated = recordPaymentAttempt(targetBookingId);
      setPaymentAttempts(updated.attempts);
      if (updated.cooldownUntil) setCooldownUntil(updated.cooldownUntil);

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

  const handleOpenCancelModal = () => {
    setShowDetailsModal(false);
    setShowCancelModal(true);
  };

  // Updated: Routes paid cancellations to Edge Function, handles unpaid directly
  const confirmCancelBooking = async () => {
    if (!selectedBooking) return;

    // Pet owners can only cancel unpaid ('to pay') bookings; awaiting approval / approved are locked
    if (selectedBooking.booking_status !== 'to pay') {
      alert('Bookings that are awaiting approval or approved can no longer be cancelled.');
      setShowCancelModal(false);
      return;
    }

    setIsCancelling(true);

    try {
      if (selectedBooking.booking_status === 'to pay') {
        // No payment made yet. Cancel safely without triggering refund flow.
        const { error } = await supabase
          .from('booking_info')
          .update({
            booking_status: 'cancelled',
            cancelled_by: 'pet_owner',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedBooking.id);

        if (error) throw new Error(error.message);
        
        setActiveTab('cancelled');
      } else {
        // Payment was made. Invoke the Edge Function to handle the 70% refund API split.
        const { error } = await supabase.functions.invoke('process-refund', {
          body: {
            booking_id: selectedBooking.id,
            cancelled_by: 'pet_owner',
            refund_reason: 'po_cancellation',
          },
        });

        if (error) throw new Error(error.message);

        setActiveTab('refund');
      }

      setShowCancelModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err: any) {
      console.error('Cancel booking error:', err);
      alert(`Error: ${err.message || 'Could not cancel booking.'}`);
    } finally {
      setIsCancelling(false);
    }
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
        </div>

        {/* 6 Category Tabs Grid */}
        <div className="booking-tabs-grid six-categories">
          <button
            className={`tab-card ${activeTab === 'awaiting_approval' ? 'active' : ''}`}
            onClick={() => setActiveTab('awaiting_approval')}
          >
            <div className="tab-icon-circle">
              <FaClock />
              {tabCounts.awaiting_approval > 0 && (
                <span className="tab-count-badge" aria-label={`${tabCounts.awaiting_approval} bookings`}>
                  {tabCounts.awaiting_approval > 99 ? '99+' : tabCounts.awaiting_approval}
                </span>
              )}
            </div>
            <span className="tab-label">Awaiting Approval</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'to_pay' ? 'active' : ''}`}
            onClick={() => setActiveTab('to_pay')}
          >
            <div className="tab-icon-circle">
              <FaCreditCard />
              {tabCounts.to_pay > 0 && (
                <span className="tab-count-badge" aria-label={`${tabCounts.to_pay} bookings`}>
                  {tabCounts.to_pay > 99 ? '99+' : tabCounts.to_pay}
                </span>
              )}
            </div>
            <span className="tab-label">To Pay</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <div className="tab-icon-circle">
              <FaCut />
              {tabCounts.upcoming > 0 && (
                <span className="tab-count-badge" aria-label={`${tabCounts.upcoming} bookings`}>
                  {tabCounts.upcoming > 99 ? '99+' : tabCounts.upcoming}
                </span>
              )}
            </div>
            <span className="tab-label">Upcoming</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            <div className="tab-icon-circle">
              <FaTimesCircle />
              {tabCounts.cancelled > 0 && (
                <span className="tab-count-badge" aria-label={`${tabCounts.cancelled} bookings`}>
                  {tabCounts.cancelled > 99 ? '99+' : tabCounts.cancelled}
                </span>
              )}
            </div>
            <span className="tab-label">Decline/Cancelled</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'refund' ? 'active' : ''}`}
            onClick={() => setActiveTab('refund')}
          >
            <div className="tab-icon-circle">
              <FaUndo />
              {tabCounts.refund > 0 && (
                <span className="tab-count-badge" aria-label={`${tabCounts.refund} bookings`}>
                  {tabCounts.refund > 99 ? '99+' : tabCounts.refund}
                </span>
              )}
            </div>
            <span className="tab-label">Refund</span>
          </button>

          <button
            className={`tab-card ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <div className="tab-icon-circle">
              <FaCheckCircle />
              {tabCounts.completed > 0 && (
                <span className="tab-count-badge" aria-label={`${tabCounts.completed} bookings`}>
                  {tabCounts.completed > 99 ? '99+' : tabCounts.completed}
                </span>
              )}
            </div>
            <span className="tab-label">Completed</span>
          </button>
        </div>

        {/* Filters for the active category */}
        <div className="bookings-filter-bar">
          <label className="filter-field">
            <span>Sort by date</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="asc">Ascending (oldest first)</option>
              <option value="desc">Descending (newest first)</option>
            </select>
          </label>

          {tabStatuses.length > 1 && (
            <label className="filter-field">
              <span>Booking status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                {tabStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          )}
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
          ) : visibleBookings.length === 0 ? (
            <div className="table-empty-box">
              <FaCalendarTimes className="empty-calendar-icon" />
              <h3 className="empty-title">No appointments found.</h3>
              <p className="empty-subtitle">There are no bookings matching this category status.</p>
            </div>
          ) : (
            <div className="table-body-rows">
              {visibleBookings.map((item) => {
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
                      {/* View Details is always available */}
                      <button
                        className="row-action-btn secondary"
                        onClick={() => handleOpenDetails(item)}
                      >
                        View Details
                      </button>

                      {/* Only bookings still waiting for a rating can be rated; once rated, only View Details remains */}
                      {item.booking_status === 'to_rate' && (
                        <button
                          className="row-action-btn"
                          style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}
                          onClick={() => handleOpenRatingModal(item)}
                        >
                          Rate Service
                        </button>
                      )}
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
          onReschedule={() => {
            setShowDetailsModal(false);
            setShowRescheduleModal(true);
          }}
          onCancelBooking={handleOpenCancelModal}
        />
      )}

      {/* Cancel Booking Confirmation Modal */}
      {showCancelModal && selectedBooking && (
        <CancelBookingModal
          bookingStatus={selectedBooking.booking_status}
          isSubmitting={isCancelling}
          onClose={() => setShowCancelModal(false)}
          onConfirm={confirmCancelBooking}
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

      {/* Submit Rating Modal */}
      {showRatingModal && ratingBooking && (
        <SubmitRatingModal
          bookingId={ratingBooking.id}
          onClose={() => setShowRatingModal(false)}
          onSubmitRating={handleRatingSubmit}
        />
      )}

      <Footer />
    </div>
  );
}