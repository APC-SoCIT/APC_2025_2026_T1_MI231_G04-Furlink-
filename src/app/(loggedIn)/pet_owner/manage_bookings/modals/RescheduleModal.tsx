import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaTimes, FaCalendarAlt, FaClock, FaChevronLeft, FaChevronRight, FaCheckCircle } from 'react-icons/fa';

interface RescheduleModalProps {
  bookingId: string;
  currentDate: string;
  currentTimeslot: string;
  onClose: () => void;
  onSubmit: (newDate: string, newTimeslot: string) => void;
}

interface TimeslotDetail {
  timeString: string;
  availableSlots: number;
  isFull: boolean;
}

export default function RescheduleModal({
  bookingId,
  currentDate,
  currentTimeslot,
  onClose,
  onSubmit,
}: RescheduleModalProps) {
  const supabase = createClientComponentClient();

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedTimeslot, setSelectedTimeslot] = useState(currentTimeslot);
  const [serviceProviderId, setServiceProviderId] = useState<string | null>(null);
  
  const [generatedSlots, setGeneratedSlots] = useState<TimeslotDetail[]>([]);
  const [isDayOpen, setIsDayOpen] = useState<boolean>(true);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [openDaysOfWeek, setOpenDaysOfWeek] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // State for custom success confirmation modal view
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Calendar navigation state
  const initialDateObj = new Date(currentDate + 'T00:00:00');
  const [currentMonth, setCurrentMonth] = useState<number>(
    isNaN(initialDateObj.getTime()) ? new Date().getMonth() : initialDateObj.getMonth()
  );
  const [currentYear, setCurrentYear] = useState<number>(
    isNaN(initialDateObj.getTime()) ? new Date().getFullYear() : initialDateObj.getFullYear()
  );

  // 1. Fetch sp_id and operating days on mount
  useEffect(() => {
    const fetchProviderInfo = async () => {
      const { data: bookingData, error: bookingError } = await supabase
        .from('booking_info')
        .select('sp_id')
        .eq('id', bookingId)
        .single();

      if (bookingError || !bookingData) return;

      const spId = bookingData.sp_id;
      setServiceProviderId(spId);

      const { data: opHoursData, error: opError } = await supabase
        .from('sp_operating_hours')
        .select('day_of_week')
        .eq('sp_id', spId);

      if (!opError && opHoursData) {
        setOpenDaysOfWeek(opHoursData.map((oh) => oh.day_of_week));
      }
    };

    fetchProviderInfo();
  }, [bookingId, supabase]);

  // 2. Fetch Slots for selected Date
  const fetchAvailableSlots = useCallback(async () => {
    if (!serviceProviderId || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const dateObj = new Date(selectedDate + 'T00:00:00');
      const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      const { data: opHours, error: opError } = await supabase
        .from('sp_operating_hours')
        .select('*')
        .eq('sp_id', serviceProviderId)
        .eq('day_of_week', dayOfWeekName)
        .single();

      if (opError || !opHours) {
        setIsDayOpen(false);
        setGeneratedSlots([]);
        setLoadingSlots(false);
        return;
      }

      setIsDayOpen(true);

      const { data: existingBookings } = await supabase
        .from('booking_info')
        .select('booking_timeslot')
        .eq('sp_id', serviceProviderId)
        .eq('booking_date', selectedDate)
        .in('booking_status', ['pending_sp_response', 'approved']);

      const bookingCounts: Record<string, number> = {};
      existingBookings?.forEach((b) => {
        if (b.booking_timeslot) {
          bookingCounts[b.booking_timeslot] = (bookingCounts[b.booking_timeslot] || 0) + 1;
        }
      });

      const slots: TimeslotDetail[] = [];
      const [openHour, openMin] = opHours.opening_time.split(':').map(Number);
      const [closeHour, closeMin] = opHours.closing_time.split(':').map(Number);

      let currentTotalMinutes = openHour * 60 + openMin;
      const closingTotalMinutes = closeHour * 60 + closeMin;
      const interval = opHours.slot_interval;
      const capacity = opHours.slot_capacity;

      while (currentTotalMinutes + interval <= closingTotalMinutes) {
        const slotHour = Math.floor(currentTotalMinutes / 60);
        const slotMin = currentTotalMinutes % 60;

        const period = slotHour >= 12 ? 'PM' : 'AM';
        const formattedHour = slotHour % 12 === 0 ? 12 : slotHour % 12;
        const formattedMin = slotMin.toString().padStart(2, '0');
        const timeString = `${formattedHour}:${formattedMin} ${period}`;

        const bookedCount = bookingCounts[timeString] || 0;
        const availableSlots = Math.max(0, capacity - bookedCount);

        slots.push({
          timeString,
          availableSlots,
          isFull: availableSlots === 0,
        });

        currentTotalMinutes += interval;
      }

      setGeneratedSlots(slots);
    } catch (err) {
      console.error('Error generating slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [serviceProviderId, selectedDate, supabase]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // Calendar Grid generation helper
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const daysArray = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateString = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      daysArray.push({ dayNum, dateString, isCurrentMonth: false });
    }

    for (let i = 1; i <= totalDaysInMonth; i++) {
      const m = currentMonth + 1;
      const dateString = `${currentYear}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      daysArray.push({ dayNum: i, dateString, isCurrentMonth: true });
    }

    const remainingCells = 42 - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateString = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      daysArray.push({ dayNum: i, dateString, isCurrentMonth: false });
    }

    return daysArray;
  }, [currentMonth, currentYear]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDayOpen) {
      alert('Cannot select a date when the service provider is closed.');
      return;
    }
    if (!selectedDate || !selectedTimeslot) {
      alert('Please select both a date and an available timeslot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_info')
        .update({
          booking_date: selectedDate,
          booking_timeslot: selectedTimeslot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Supabase reschedule update error:', error);
        alert('Failed to update booking schedule in database. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Show custom success modal instead of native browser alert
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Unexpected error during reschedule save:', err);
      alert('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const handleFinishSuccess = () => {
    setShowSuccessModal(false);
    onSubmit(selectedDate, selectedTimeslot); // Closes modal & refreshes list
  };

  return (
    <div className="modal-backdrop">
      <div className="reschedule-modal-card" style={{ maxWidth: '480px' }}>
        <div className="summary-modal-header">
          <div className="modal-header-title">
            <FaCalendarAlt className="header-doc-icon" />
            <h2>Reschedule Appointment</h2>
          </div>
          <button className="modal-close-x" onClick={onClose} disabled={isSubmitting}>
            <FaTimes />
          </button>
        </div>

        {showSuccessModal ? (
          /* Custom Success Confirmation View */
          <div className="reschedule-success-container" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <FaCheckCircle style={{ fontSize: '48px', color: '#16a34a', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
              Booking Successfully Rescheduled!
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Your appointment has been updated to <strong>{selectedDate}</strong> at <strong>{selectedTimeslot}</strong>.
            </p>
            <button
              type="button"
              className="btn-primary-action"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
              onClick={handleFinishSuccess}
            >
              Done
            </button>
          </div>
        ) : (
          /* Normal Reschedule Form */
          <form onSubmit={handleSubmit} className="reschedule-modal-body">
            <div className="form-group">
              <label>
                <FaCalendarAlt /> Select New Date:
              </label>
              <div className="custom-calendar-container">
                <div className="calendar-header-nav">
                  <span className="calendar-month-title">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <div className="calendar-nav-buttons">
                    <button type="button" onClick={handlePrevMonth} className="cal-nav-btn">
                      <FaChevronLeft />
                    </button>
                    <button type="button" onClick={handleNextMonth} className="cal-nav-btn">
                      <FaChevronRight />
                    </button>
                  </div>
                </div>

                <div className="calendar-weekdays-grid">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                <div className="calendar-days-grid">
                  {calendarDays.map((item, idx) => {
                    const dateObj = new Date(item.dateString + 'T00:00:00');
                    const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                    const todayStr = new Date().toISOString().split('T')[0];

                    const isPast = item.dateString < todayStr;
                    const isClosed = openDaysOfWeek.length > 0 && !openDaysOfWeek.includes(dayOfWeekName);
                    const isDisabled = !item.isCurrentMonth || isPast || isClosed;
                    const isSelected = selectedDate === item.dateString;

                    return (
                      <button
                        type="button"
                        key={idx}
                        disabled={isDisabled}
                        className={`cal-day-cell ${isSelected ? 'selected' : ''} ${
                          isDisabled ? 'disabled-closed' : ''
                        }`}
                        onClick={() => !isDisabled && setSelectedDate(item.dateString)}
                      >
                        {item.dayNum}
                      </button>
                    );
                  })}
                </div>

                <div className="calendar-footer-actions">
                  <button
                    type="button"
                    className="cal-footer-link"
                    onClick={() => setSelectedDate('')}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="cal-footer-link"
                    onClick={() => {
                      const now = new Date();
                      setCurrentMonth(now.getMonth());
                      setCurrentYear(now.getFullYear());
                      setSelectedDate(now.toISOString().split('T')[0]);
                    }}
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>
                <FaClock /> Available Slots & Timeslots:
              </label>

              {loadingSlots ? (
                <p className="slots-loading-text">Loading available slots...</p>
              ) : !isDayOpen ? (
                <div className="closed-day-banner">
                  Service Provider is <strong>closed</strong> on this day. Please pick another date.
                </div>
              ) : generatedSlots.length === 0 ? (
                <div className="closed-day-banner">No slots available for this date.</div>
              ) : (
                <div className="timeslot-grid">
                  {generatedSlots.map((slot) => {
                    const isSelected = selectedTimeslot === slot.timeString;
                    return (
                      <button
                        type="button"
                        key={slot.timeString}
                        disabled={slot.isFull}
                        className={`timeslot-chip ${isSelected ? 'selected' : ''} ${
                          slot.isFull ? 'fully-booked' : ''
                        }`}
                        onClick={() => !slot.isFull && setSelectedTimeslot(slot.timeString)}
                      >
                        <span className="slot-time">{slot.timeString}</span>
                        <span className="slot-remaining">
                          {slot.isFull ? 'Full' : `${slot.availableSlots} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="reschedule-modal-footer">
              <button type="button" className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-action"
                disabled={
                  isSubmitting ||
                  !isDayOpen ||
                  generatedSlots.find((s) => s.timeString === selectedTimeslot)?.isFull
                }
              >
                {isSubmitting ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}