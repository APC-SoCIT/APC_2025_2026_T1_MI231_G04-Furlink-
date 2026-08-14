'use client';

import React, { useState, useEffect } from "react";
// Supabase client component helper for session management
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { FaCalendarAlt, FaChartLine } from 'react-icons/fa';
import { Booking, BookingStatus } from "./type";
import { filterBookingsByStatus, formatCurrency, formatStatus } from "./utils";
import BookingDetailsModal from './components/BookingDetailsModal';
import CalendarModal from './components/CalendarModal';
import styles from "./sp_dashboard.module.css";

export default function ServiceProviderDashboardPage() {
  const supabase = createClientComponentClient();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch bookings on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Fetch bookings from Supabase with nested pet and service data
  const fetchBookings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("booking_info")
        .select(`
          *,
          booking_pet_info (
            *,
            booking_service_info (*)
          )
        `)
        .order("booking_date", { ascending: false });

      if (error) throw error;
      
      console.log("Fetched bookings with session client:", data);
      setBookings(data || []);
    } catch (err: any) {
      console.error("Error fetching bookings:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  // Update booking status and rejection reason (if applicable)
  const handleUpdateStatus = async (id: string, newStatus: BookingStatus, reason?: string) => {
    try {
      const updatePayload: any = { 
        booking_status: newStatus, 
        updated_at: new Date().toISOString() 
      };
      if (reason) updatePayload.booking_rejection_reason = reason;

      const { error } = await supabase
        .from("booking_info")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;

      // Update local state to reflect changes
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updatePayload } : b))
      );
      setSelectedBooking(null);
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || JSON.stringify(err)));
    }
  };

  // Tab configuration for filtering bookings by status
  const TAB_CARDS: { label: string; value: BookingStatus | 'all'; filter: BookingStatus[] }[] = [
    { label: 'New Requests', value: 'pending_sp_response', filter: ['pending_sp_response'] },
    { label: 'Verify Payment', value: 'approved', filter: ['approved'] },
    { label: 'Upcoming', value: 'paid', filter: ['paid'] },
    { label: 'Completed', value: 'rated', filter: ['to_rate', 'rated'] },
    { label: 'Cancelled', value: 'cancelled', filter: ['rejected', 'cancelled'] },
  ];

  // Calculate revenue metrics
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  
  // Total revenue includes: approved, paid, to_rate, and rated bookings
  // Note: 'approved' status is included now, will be refined during PayMongo integration
  const totalRevenue = bookings
    .filter(b => ['approved', 'paid', 'to_rate', 'rated'].includes(b.booking_status))
    .reduce((sum, b) => sum + Number(b.booking_total_amount || 0), 0);

  // Get active tab configuration and filter bookings
  const activeTabConfig = TAB_CARDS.find(t => t.value === activeTab);
  const filteredBookings = filterBookingsByStatus(bookings, activeTab);

  // Show loading state
  if (loading) {
    return <div className={styles.container}>Loading Dashboard...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header - Revenue Card & Action Buttons */}
      <div className={styles.headerRow}>
        <div className={styles.revenueCard}>
          <div>
            <h2>Total Revenue</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>For the month of {currentMonth}</p>
          </div>
          <div className={styles.revenueAmount}>{formatCurrency(totalRevenue)}</div>
        </div>

        <div className={styles.actionButtons}>
          <Link href="/service_provider/business-dashboard" style={{ minWidth: '120px' }}>
            <button className={styles.actionBtn} style={{ minWidth: '120px' }}>
              <FaChartLine size={24} /> Dashboard
            </button>
          </Link>
          <button 
            className={styles.actionBtn}
            onClick={() => setShowCalendar(true)}
            style={{ minWidth: '120px' }}
          >
            <FaCalendarAlt size={24} /> Calendar
          </button>
        </div>
      </div>

      {/* Booking Status Tabs */}
      <div className={styles.tabsGrid}>
        <div
          onClick={() => setActiveTab('all')}
          className={`${styles.tabCard} ${activeTab === 'all' ? styles.tabCardActive : ''}`}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>All Bookings</h3>
          <p className={styles.tabCount}>{bookings.length}</p>
        </div>

        {TAB_CARDS.map((tab) => {
          const count = bookings.filter(b => tab.filter.includes(b.booking_status)).length;
          const isActive = activeTab === tab.value;
          return (
            <div
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`${styles.tabCard} ${isActive ? styles.tabCardActive : ''}`}
            >
              <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{tab.label}</h3>
              <p className={`${styles.tabCount} ${tab.value === 'cancelled' && !isActive ? styles.cancelledCount : ''}`}>
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bookings Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeaderBar}>
          <h3 style={{ fontWeight: 'extrabold', textTransform: 'uppercase' }}>
            {activeTab === 'all' ? 'All Bookings' : activeTabConfig?.label}
          </h3>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th style={{ textAlign: 'center' }}>No. of Pets</th>
              <th>Service to Avail</th>
              <th>Total Amt</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
                  No bookings found for this category.
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => {
                const petCount = booking.booking_pet_info?.length || 0;
                const services = booking.booking_pet_info
                  ?.flatMap(pet => pet.booking_service_info?.map(s => s.booking_service_name))
                  .filter(Boolean)
                  .join(', ') || 'N/A';

                return (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.booking_date}</strong>
                      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{booking.booking_timeslot}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{petCount}</td>
                    <td style={{ fontSize: '0.875rem', maxWidth: '200px' }}>{services}</td>
                    <td><strong>{formatCurrency(booking.booking_total_amount)}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.statusBadge}>{formatStatus(booking.booking_status)}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => setSelectedBooking(booking)} className={styles.viewBtn}>
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Details Modal - for viewing and managing individual bookings */}
      {selectedBooking && (
        <BookingDetailsModal
          selectedBooking={selectedBooking}
          setSelectedBooking={setSelectedBooking}
          handleUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Calendar Modal - for viewing appointments by date */}
      {showCalendar && (
        <CalendarModal
          bookings={bookings}
          setShowCalendar={setShowCalendar}
        />
      )}
    </div>
  );
}