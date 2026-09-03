'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronLeft, FaChevronRight, FaExclamationTriangle } from 'react-icons/fa';

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
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  pet_count?: number;
};

type BookingWidgetProps = {
  spId: string;
  operatingHours: OperatingHour[];
  existingBookings?: ExistingBooking[];
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BookingWidget({ 
  spId, 
  operatingHours, 
  existingBookings = [] 
}: BookingWidgetProps) {
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const nowTime = today.getTime();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const defaultSelectedDate = useMemo(() => {
    const minBookingTime = new Date(nowTime + TWENTY_FOUR_HOURS_MS);
    return new Date(minBookingTime.getFullYear(), minBookingTime.getMonth(), minBookingTime.getDate());
  }, [nowTime]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(defaultSelectedDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [numPets, setNumPets] = useState<number>(1);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);

  const hoursByDay = useMemo(() => {
    const map = new Map<string, OperatingHour>();
    operatingHours.forEach((oh) => map.set(oh.day_of_week, oh));
    return map;
  }, [operatingHours]);

  const selectedDayName = selectedDate ? DAYS_OF_WEEK[selectedDate.getDay()] : null;
  const currentOperatingHour = selectedDayName ? hoursByDay.get(selectedDayName) : null;

  const generatedSlots = useMemo(() => {
    if (!currentOperatingHour || !selectedDate) return [];

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
  }, [currentOperatingHour, selectedDate, nowTime]);

  // Helper to compute remaining capacity for a specific slot
  const getRemainingCapacity = (slot: string): number => {
    if (!selectedDate || !currentOperatingHour) return 0;

    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const activeStatuses = ['pending_sp_response', 'confirmed', 'to pay', 'paid'];
    
    const slotBookings = existingBookings.filter(
      (b) =>
        b.booking_date === dateStr &&
        b.booking_timeslot === slot &&
        activeStatuses.includes(b.booking_status.toLowerCase())
    );

    const bookedPets = slotBookings.reduce((sum, b) => sum + (b.pet_count || 1), 0);
    return Math.max(0, currentOperatingHour.slot_capacity - bookedPets);
  };

  const maxCapacity = useMemo(() => {
    if (!selectedTimeSlot) return currentOperatingHour ? currentOperatingHour.slot_capacity : 1;
    return getRemainingCapacity(selectedTimeSlot);
  }, [selectedTimeSlot, selectedDate, existingBookings, currentOperatingHour]);

  const sameDayBooking = useMemo(() => {
    if (!selectedDate) return null;
    
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    return existingBookings.find((b) => b.booking_date === dateStr) || null;
  }, [selectedDate, existingBookings]);

  const isMinMonth =
    currentDate.getFullYear() < today.getFullYear() ||
    (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() <= today.getMonth());

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
      alert(`The maximum slot capacity remaining for this time slot is ${maxCapacity} pet(s).`);
    } else {
      setNumPets(val);
    }
  };

  const isBookingValid =
    selectedDate !== null &&
    selectedTimeSlot !== '' &&
    numPets >= 1 &&
    numPets <= maxCapacity &&
    maxCapacity > 0 &&
    agreedTerms;

  const handleCompleteBooking = () => {
    if (!isBookingValid || !selectedDate) return;

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

              const hasExisting = existingBookings.some((b) => b.booking_date === dStr);

              let tooltipMessage = `${dayName}: Open`;
              if (isPastOrWithin24Hours) {
                tooltipMessage = 'Bookings require at least 24 hours advance notice';
              } else if (!isOpen) {
                tooltipMessage = `${dayName}: Closed`;
              } else if (hasExisting) {
                tooltipMessage = 'You already have a booking on this date';
              }

              return (
                <span
                  key={dayNum}
                  onClick={() => handleDateSelect(dayNum, isSelectable)}
                  className={`
                    ${isSelected ? 'selected' : ''} 
                    ${!isSelectable ? 'disabled-date' : ''} 
                    ${hasExisting && !isSelected && isSelectable ? 'has-booking' : ''}
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
            <strong>Existing Booking Found:</strong> You already have an appointment on this day at <strong>{sameDayBooking.booking_timeslot}</strong> ({sameDayBooking.booking_status.replace(/_/g, ' ')}).
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
          I agree to the <strong>Terms and Conditions</strong> including policies on down payments, cancellations, and pet safety.
        </label>
      </div>

      <button
        disabled={!isBookingValid}
        className={`complete-booking-btn ${isBookingValid ? 'active' : ''}`}
        onClick={handleCompleteBooking}
      >
        Complete Booking
      </button>
    </div>
  );
}