'use client';

import React, { useState, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export type OperatingHour = {
  id: string;
  sp_id: string;
  day_of_week: string;
  opening_time: string;
  closing_time: string;
  slot_interval: number; // in minutes
  slot_capacity: number; // max pets per slot
};

type BookingWidgetProps = {
  spId: string;
  operatingHours: OperatingHour[];
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BookingWidget({ spId, operatingHours }: BookingWidgetProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // August 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 7, 5)); // Default Aug 5, 2026
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [numPets, setNumPets] = useState<number>(1);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);

  // Map operating hours by day of week
  const hoursByDay = useMemo(() => {
    const map = new Map<string, OperatingHour>();
    operatingHours.forEach((oh) => map.set(oh.day_of_week, oh));
    return map;
  }, [operatingHours]);

  // Determine current day of week and operating settings for selected date
  const selectedDayName = selectedDate ? DAYS_OF_WEEK[selectedDate.getDay()] : null;
  const currentOperatingHour = selectedDayName ? hoursByDay.get(selectedDayName) : null;

  // Generate Available Time Slots based on Opening Time, Closing Time, and Slot Interval
  const generatedSlots = useMemo(() => {
    if (!currentOperatingHour) return [];

    const slots: string[] = [];
    const [openH, openM] = currentOperatingHour.opening_time.split(':').map(Number);
    const [closeH, closeM] = currentOperatingHour.closing_time.split(':').map(Number);

    let currentMin = openH * 60 + openM;
    const closingMin = closeH * 60 + closeM;
    const interval = currentOperatingHour.slot_interval;

    while (currentMin + interval <= closingMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 === 0 ? 12 : h % 12;
      const formattedM = m < 10 ? `0${m}` : m;

      slots.push(`${formattedH}:${formattedM} ${period}`);
      currentMin += interval;
    }

    return slots;
  }, [currentOperatingHour]);

  // Max pets allowed per slot
  const maxCapacity = currentOperatingHour ? currentOperatingHour.slot_capacity : 1;

  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar rendering helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDateSelect = (dayNum: number) => {
    const newDate = new Date(year, month, dayNum);
    setSelectedDate(newDate);
    setSelectedTimeSlot(''); // Reset time slot on date change
    setNumPets(1); // Reset pets count
  };

  const handlePetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    if (val < 1) {
      setNumPets(1);
    } else if (val > maxCapacity) {
      setNumPets(maxCapacity);
      alert(`The maximum slot capacity for this provider is ${maxCapacity} pet(s).`);
    } else {
      setNumPets(val);
    }
  };

  const isBookingValid =
    selectedDate !== null &&
    selectedTimeSlot !== '' &&
    numPets >= 1 &&
    numPets <= maxCapacity &&
    agreedTerms;

  return (
    <div className="widget-card">
      <h2 className="widget-title">Book Appointment</h2>

      {/* 1. SELECT DATE */}
      <div className="form-group">
        <label className="field-label">SELECT DATE</label>
        <div className="calendar-box">
          <div className="calendar-header">
            <button type="button" onClick={handlePrevMonth} className="cal-nav-btn">
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
            {/* Empty slots for offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <span key={`empty-${i}`} className="muted"></span>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const thisDate = new Date(year, month, dayNum);
              const dayName = DAYS_OF_WEEK[thisDate.getDay()];
              const isOpen = hoursByDay.has(dayName);

              const isSelected =
                selectedDate &&
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

              return (
                <span
                  key={dayNum}
                  onClick={() => isOpen && handleDateSelect(dayNum)}
                  className={`${isSelected ? 'selected' : ''} ${!isOpen ? 'disabled-date' : ''}`}
                  title={isOpen ? `${dayName}: Open` : `${dayName}: Closed`}
                >
                  {dayNum}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. SELECT TIME SLOT */}
      <div className="form-group">
        <label className="field-label">SELECT TIME SLOT</label>
        <select
          className="widget-select"
          value={selectedTimeSlot}
          onChange={(e) => setSelectedTimeSlot(e.target.value)}
          disabled={!currentOperatingHour || generatedSlots.length === 0}
        >
          {!currentOperatingHour ? (
            <option value="">Closed on selected date</option>
          ) : generatedSlots.length === 0 ? (
            <option value="">No slots available</option>
          ) : (
            <>
              <option value="" disabled>-- Select a Time Slot --</option>
              {generatedSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* 3. NUMBER OF PETS */}
      <div className="form-group">
        <label className="field-label">
          NUMBER OF PETS {currentOperatingHour && `(Max: ${maxCapacity})`}
        </label>
        <input
          type="number"
          value={numPets}
          min={1}
          max={maxCapacity}
          onChange={handlePetChange}
          disabled={!selectedTimeSlot}
          className="widget-input"
        />
      </div>

      {/* 4. TERMS CHECKBOX */}
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

      {/* 5. SUBMIT BUTTON */}
      <button
        disabled={!isBookingValid}
        className={`complete-booking-btn ${isBookingValid ? 'active' : ''}`}
        onClick={() => {
          alert(`Appointment booked for ${numPets} pet(s) on ${selectedDate?.toDateString()} at ${selectedTimeSlot}!`);
        }}
      >
        Complete Booking
      </button>
    </div>
  );
}