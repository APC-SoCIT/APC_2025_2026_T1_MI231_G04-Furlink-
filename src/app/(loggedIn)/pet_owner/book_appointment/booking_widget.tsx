'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaChevronLeft, FaChevronRight, FaExclamationTriangle } from 'react-icons/fa';
import './capacity_modal.css';
import { useAccountStatus } from '@/context/AccountStatusContext';

export type OperatingHour = {
  id: string;
  sp_id: string;
  day_of_week: string;
  opening_time: string;
  closing_time: string;
  slot_interval: number;
  slot_capacity: number;
};

export type ExistingBooking = {
  id: string;
  profiles_id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  pet_count?: number;
};

type BookingWidgetProps = {
  spId: string;
  operatingHours?: OperatingHour[];
  existingBookings?: ExistingBooking[];
  currentUserId: string;
  waiverUrl?: string | null;
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ACTIVE_HOLD_STATUSES = [
  'pending_sp_response',
  'to pay',
  'approved',
  'paid',
  'processing'
];

export default function BookingWidget({ 
  spId, 
  operatingHours = [], 
  existingBookings = [],
  currentUserId,
  waiverUrl
}: BookingWidgetProps) {
  const router = useRouter();

  const isDefaultWaiver =
    !waiverUrl ||
    waiverUrl === 'PLATFORM_DEFAULT_WAIVER' ||
    waiverUrl.includes('furlink-standard-waiver.pdf');
  const resolvedWaiverHref = (isDefaultWaiver ? null : waiverUrl) ?? '/service_provider/waiver';

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [nowTime, setNowTime] = useState<number>(0);
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [numPets, setNumPets] = useState<number>(1);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);
  const { isSuspended } = useAccountStatus();
  // Remaining capacity shown in the "capacity reached" modal (null = modal closed)
  const [capacityModalLimit, setCapacityModalLimit] = useState<number | null>(null);

  useEffect(() => {
    const clientNow = new Date();
    const clientNowTime = clientNow.getTime();
    setNowTime(clientNowTime);

    setCurrentDate(new Date(clientNow.getFullYear(), clientNow.getMonth(), 1));

    const minBookingTime = new Date(clientNowTime + TWENTY_FOUR_HOURS_MS);
    setSelectedDate(
      new Date(minBookingTime.getFullYear(), minBookingTime.getMonth(), minBookingTime.getDate())
    );

    setIsMounted(true);
  }, [TWENTY_FOUR_HOURS_MS]);

  const hoursByDay = useMemo(() => {
    const map = new Map<string, OperatingHour>();
    // Safeguard against undefined/null operatingHours arrays
    if (Array.isArray(operatingHours)) {
      operatingHours.forEach((oh) => map.set(oh.day_of_week, oh));
    }
    return map;
  }, [operatingHours]);

  const selectedDayName = selectedDate ? DAYS_OF_WEEK[selectedDate.getDay()] : null;
  const currentOperatingHour = selectedDayName ? hoursByDay.get(selectedDayName) : null;

  const generatedSlots = useMemo(() => {
    if (!isMounted || !currentOperatingHour || !selectedDate) return [];

    const slots: string[] = [];
    const [openH, openM] = currentOperatingHour.opening_time.split(':').map(Number);
    const [closeH, closeM] = currentOperatingHour.closing_time.split(':').map(Number);

    let currentMin = openH * 60 + openM;
    const closingMin = closeH * 60 + closeM;
    const interval = currentOperatingHour.slot_interval;

    while (currentMin + interval <= closingMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;

      const slotDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        h,
        m
      );

      if (slotDateTime.getTime() - nowTime >= TWENTY_FOUR_HOURS_MS) {
        const period = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 === 0 ? 12 : h % 12;
        const formattedM = m < 10 ? `0${m}` : m;
        slots.push(`${formattedH}:${formattedM} ${period}`);
      }

      currentMin += interval;
    }

    return slots;
  }, [currentOperatingHour, selectedDate, nowTime, isMounted]);

  // Global capacity subtraction across all users
  const getRemainingCapacity = (slot: string): number => {
    if (!selectedDate || !currentOperatingHour) return 0;

    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const slotBookings = existingBookings.filter(
      (b) =>
        b.booking_date === dateStr &&
        b.booking_timeslot === slot &&
        ACTIVE_HOLD_STATUSES.includes(b.booking_status.toLowerCase())
    );

    const bookedPets = slotBookings.reduce((sum, b) => sum + (Number(b.pet_count) || 1), 0);
    return Math.max(0, currentOperatingHour.slot_capacity - bookedPets);
  };

  const maxCapacity = useMemo(() => {
    if (!selectedTimeSlot) return currentOperatingHour ? currentOperatingHour.slot_capacity : 1;
    return getRemainingCapacity(selectedTimeSlot);
  }, [selectedTimeSlot, selectedDate, existingBookings, currentOperatingHour]);

  // Same-day warnings restricted strictly to the current logged-in user's bookings
  const sameDayBooking = useMemo(() => {
    if (!selectedDate || !currentUserId) return null;
    
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    return existingBookings.find(
      (b) =>
        b.booking_date === dateStr &&
        b.profiles_id === currentUserId &&
        ACTIVE_HOLD_STATUSES.includes(b.booking_status.toLowerCase())
    ) || null;
  }, [selectedDate, existingBookings, currentUserId]);

  const todayYear = isMounted ? new Date().getFullYear() : 2026;
  const todayMonth = isMounted ? new Date().getMonth() : 0;

  const isMinMonth =
    currentDate.getFullYear() < todayYear ||
    (currentDate.getFullYear() === todayYear && currentDate.getMonth() <= todayMonth);

  const handlePrevMonth = () => {
    if (isMinMonth) return;
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDateSelect = (dayNum: number, isAllowed: boolean) => {
    if (!isAllowed) return;
    const newDate = new Date(year, month, dayNum);
    setSelectedDate(newDate);
    setSelectedTimeSlot('');
    setNumPets(1);
  };

  const handlePetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    if (val < 1) {
      setNumPets(1);
    } else if (val > maxCapacity) {
      setNumPets(maxCapacity);
      setCapacityModalLimit(maxCapacity);
    } else {
      setNumPets(val);
    }
  };

  const isBookingValid =
    isMounted &&
    selectedDate !== null &&
    selectedTimeSlot !== '' &&
    numPets >= 1 &&
    numPets <= maxCapacity &&
    maxCapacity > 0 &&
    agreedTerms;

  const handleCompleteBooking = () => {
    if (isSuspended || !isBookingValid || !selectedDate) return;

    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    const query = new URLSearchParams({
      sp_id: spId,
      date: formattedDate,
      time: selectedTimeSlot,
      pets: numPets.toString(),
    });

    router.push(`/pet_owner/book_appointment/booking_form?${query.toString()}`);
  };

  if (!isMounted) {
    return (
      <div className="widget-card">
        <h2 className="widget-title">Book Appointment</h2>
        <p style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <h2 className="widget-title">Book Appointment</h2>

      <div className="form-group">
        <label className="field-label">SELECT DATE</label>
        <div className="calendar-box">
          <div className="calendar-header">
            <button 
              type="button" 
              onClick={handlePrevMonth} 
              className={`cal-nav-btn ${isMinMonth ? 'disabled' : ''}`}
              disabled={isMinMonth}
            >
              <FaChevronLeft />
            </button>
            <span className="cal-month-title">
              {monthName} {year}
            </span>
            <button type="button" onClick={handleNextMonth} className="cal-nav-btn">
              <FaChevronRight />
            </button>
          </div>

          <div className="calendar-days-grid">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>

          <div className="calendar-dates-grid">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <span key={`empty-${i}`} className="muted"></span>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const thisDate = new Date(year, month, dayNum);
              const dayName = DAYS_OF_WEEK[thisDate.getDay()];
              const isOpen = hoursByDay.has(dayName);

              const endOfThisDate = new Date(year, month, dayNum, 23, 59, 59).getTime();
              const isPastOrWithin24Hours = endOfThisDate < (nowTime + TWENTY_FOUR_HOURS_MS);

              const isSelectable = isOpen && !isPastOrWithin24Hours;

              const isSelected =
                selectedDate &&
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

              const yyyy = thisDate.getFullYear();
              const mm = String(thisDate.getMonth() + 1).padStart(2, '0');
              const dd = String(thisDate.getDate()).padStart(2, '0');
              const dStr = `${yyyy}-${mm}-${dd}`;

              const hasUserActiveBooking = existingBookings.some(
                (b) => b.booking_date === dStr && b.profiles_id === currentUserId && ACTIVE_HOLD_STATUSES.includes(b.booking_status.toLowerCase())
              );

              let tooltipMessage = `${dayName}: Open`;
              if (isPastOrWithin24Hours) {
                tooltipMessage = 'Bookings require at least 24 hours advance notice';
              } else if (!isOpen) {
                tooltipMessage = `${dayName}: Closed`;
              } else if (hasUserActiveBooking) {
                tooltipMessage = 'You already have an active booking on this date';
              }

              return (
                <span
                  key={dayNum}
                  onClick={() => handleDateSelect(dayNum, isSelectable)}
                  className={`
                    ${isSelected ? 'selected' : ''} 
                    ${!isSelectable ? 'disabled-date' : ''} 
                    ${hasUserActiveBooking && !isSelected && isSelectable ? 'has-booking' : ''}
                  `}
                  title={tooltipMessage}
                >
                  {dayNum}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {sameDayBooking && (
        <div className="same-day-warning">
          <FaExclamationTriangle className="warning-icon" />
          <div>
            <strong>Existing Booking Found:</strong> You already have an active appointment on this day at <strong>{sameDayBooking.booking_timeslot}</strong> ({sameDayBooking.booking_status.replace(/_/g, ' ')}).
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="field-label">SELECT TIME SLOT</label>
        <select
          className="widget-select"
          value={selectedTimeSlot}
          onChange={(e) => {
            setSelectedTimeSlot(e.target.value);
            setNumPets(1);
          }}
          disabled={!currentOperatingHour || generatedSlots.length === 0}
        >
          {!currentOperatingHour ? (
            <option value="">Closed on selected date</option>
          ) : generatedSlots.length === 0 ? (
            <option value="">No slots available (min. 24h advance required)</option>
          ) : (
            <>
              <option value="" disabled>-- Select a Time Slot --</option>
              {generatedSlots.map((slot) => {
                const remaining = getRemainingCapacity(slot);
                const isFull = remaining <= 0;

                return (
                  <option key={slot} value={slot} disabled={isFull}>
                    {slot} {isFull ? '(Fully Booked)' : `(${remaining} slot${remaining > 1 ? 's' : ''} left)`}
                  </option>
                );
              })}
            </>
          )}
        </select>
      </div>

      <div className="form-group">
        <label className="field-label">
          NUMBER OF PETS {selectedTimeSlot && `(Max Available: ${maxCapacity})`}
        </label>
        <input
          type="number"
          value={numPets}
          min={1}
          max={maxCapacity}
          onChange={handlePetChange}
          disabled={!selectedTimeSlot || maxCapacity <= 0}
          className="widget-input"
        />
      </div>

      <div className="terms-checkbox-group">
        <input
          type="checkbox"
          id="terms"
          checked={agreedTerms}
          onChange={(e) => setAgreedTerms(e.target.checked)}
        />
        <label htmlFor="terms">
          I agree to the{' '}
          <Link 
            href="/terms_and_conditions" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--btn-dark-blue)', textDecoration: 'underline' }}
          >
            <strong>Terms and Conditions</strong>
          </Link>{' '}
          and the{' '}
          <a
            href={resolvedWaiverHref} //adding waiver page
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--btn-dark-blue)', textDecoration: 'underline' }}
          >
            <strong>Service Waiver</strong>
          </a>
          , including policies on down payments, cancellations, and pet safety.
        </label>
      </div>

      <button
        disabled={!isBookingValid || isSuspended}
        className={`complete-booking-btn ${isBookingValid && !isSuspended ? 'active' : ''}`}
        onClick={handleCompleteBooking}
      >
        Complete Booking
      </button>
      {isSuspended && (
        <p style={{ color: '#b45309', fontSize: 13, fontWeight: 600, textAlign: 'center', marginTop: 8 }}>
          Your account is suspended, so you can&apos;t make new bookings right now.
        </p>
      )}

      {capacityModalLimit !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="cap-wm-overlay" onClick={() => setCapacityModalLimit(null)}>
            <div
              className="cap-wm-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cap-wm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cap-wm-icon">
                <FaExclamationTriangle />
              </div>
              <h2 id="cap-wm-title" className="cap-wm-title">Capacity Reached</h2>
              <p className="cap-wm-message">
                {capacityModalLimit > 0 ? (
                  <>
                    The maximum slot capacity remaining for this time slot is{' '}
                    <strong>
                      {capacityModalLimit} pet{capacityModalLimit === 1 ? '' : 's'}
                    </strong>
                    .
                  </>
                ) : (
                  <>There is no slot capacity remaining for this time slot.</>
                )}
              </p>
              <button className="cap-wm-btn" onClick={() => setCapacityModalLimit(null)}>
                Got it
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}