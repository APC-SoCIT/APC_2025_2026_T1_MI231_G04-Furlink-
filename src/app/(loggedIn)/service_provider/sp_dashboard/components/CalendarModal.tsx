import React, { useState } from 'react';
import { Booking } from '../type';
import { formatCurrency, formatStatus } from '../utils';

interface CalendarModalProps {
  bookings: Booking[];
  setShowCalendar: (show: boolean) => void;
}

export default function CalendarModal({ bookings, setShowCalendar }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group bookings by date
  const bookingsByDate: { [key: string]: Booking[] } = {};
  bookings.forEach((booking) => {
    if (!bookingsByDate[booking.booking_date]) {
      bookingsByDate[booking.booking_date] = [];
    }
    bookingsByDate[booking.booking_date].push(booking);
  });

  // Get selected day bookings
  const dayBookings = selectedDate ? bookingsByDate[selectedDate] || [] : [];

  // Create calendar grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30, 58, 138, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '1.5rem', maxWidth: '900px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'black' }}>Calendar</h3>
          <button
            onClick={() => setShowCalendar(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Calendar Grid */}
          <div>
            {/* Month Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button
                onClick={handlePrevMonth}
                style={{ padding: '0.5rem 1rem', background: '#f1f5f9', color: '#1e3a8a', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                ← Prev
              </button>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1e3a8a' }}>{monthName}</h4>
              <button
                onClick={handleNextMonth}
                style={{ padding: '0.5rem 1rem', background: '#f1f5f9', color: '#1e3a8a', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Next →
              </button>
            </div>

            {/* Weekday Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', padding: '0.5rem' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {days.map((day, idx) => {
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                const dayBookingCount = dateStr ? (bookingsByDate[dateStr]?.length || 0) : 0;
                const isSelected = dateStr === selectedDate;
                const hasBookings = dayBookingCount > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => day && handleDateClick(day)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: isSelected ? '2px solid #1e3a8a' : hasBookings ? '2px solid #facc15' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : hasBookings ? '#fffdf0' : day ? '#f8fafc' : 'white',
                      minHeight: '60px',
                      cursor: day ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      if (day) {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {day && (
                      <>
                        <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a' }}>{day}</span>
                        {dayBookingCount > 0 && (
                          <span style={{ fontSize: '0.75rem', background: '#facc15', color: '#1e3a8a', padding: '0.125rem 0.5rem', borderRadius: '9999px', marginTop: '0.25rem', fontWeight: 'bold' }}>
                            {dayBookingCount}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day View / Details */}
          <div style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            {selectedDate ? (
              <>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h4>

                {dayBookings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {dayBookings.map((booking) => (
                      <div key={booking.id} style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a' }}>{booking.booking_timeslot}</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {booking.booking_pet_info?.length || 0} pet{(booking.booking_pet_info?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', background: booking.booking_status === 'pending_sp_response' ? '#fef3c7' : booking.booking_status === 'approved' ? '#d1fae5' : booking.booking_status === 'paid' ? '#dbeafe' : '#fee2e2', color: booking.booking_status === 'pending_sp_response' ? '#d97706' : booking.booking_status === 'approved' ? '#059669' : booking.booking_status === 'paid' ? '#0369a1' : '#dc2626', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                            {formatStatus(booking.booking_status)}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          {booking.booking_pet_info?.map(p => p.booking_pet_name).join(', ') || 'N/A'}
                        </p>

                        <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b' }}>
                          {booking.booking_pet_info
                            ?.flatMap(pet => pet.booking_service_info?.map(s => s.booking_service_name))
                            .filter(Boolean)
                            .join(', ') || 'N/A'}
                        </p>

                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                          {formatCurrency(booking.booking_total_amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', paddingTop: '2rem' }}>
                    No appointments on this date
                  </p>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>
                  Select a date to view appointments
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowCalendar(false)}
            style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.875rem' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}