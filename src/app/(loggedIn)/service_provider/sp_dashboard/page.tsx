'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { FaCalendarAlt, FaChartLine } from 'react-icons/fa';
import { Booking, BookingStatus } from "./type";
import { filterBookingsByStatus, formatCurrency, formatStatus } from "./utils";
import BookingDetailsModal from './components/BookingDetailsModal';
import CalendarModal from './components/CalendarModal';
import Footer from '@/components/Footer';
import styles from "./sp_dashboard.module.css";

export default function ServiceProviderDashboardPage() {
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("No authenticated user session found.");

      const { data: providerData, error: providerError } = await supabase
        .from("sp_general_info")
        .select("id")
        .eq("profiles_id", user.id)
        .single();

      if (providerError || !providerData) {
        console.warn("Current user is not registered as a service provider.");
        setBookings([]);
        return;
      }

      const { data, error } = await supabase
        .from("booking_info")
        .select(`
          *,
          booking_pet_info (
            *,
            booking_service_info (*)
          )
        `)
        .eq("sp_id", providerData.id)
        .order("booking_date", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err: any) {
      console.error("Error fetching bookings:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus, reason?: string) => {
    try {
      const targetBooking = bookings.find(b => b.id === id);
      
      // TRIGGER EDGE FUNCTION: For Paid, Approved, or Pending Requests (since they pay upfront)
      if ((newStatus === 'rejected' || newStatus === 'cancelled') && (targetBooking?.booking_status === 'paid' || targetBooking?.booking_status === 'approved' || targetBooking?.booking_status === 'pending_sp_response')) {
        const { error } = await supabase.functions.invoke('process-refund', {
          body: {
            booking_id: id,
            cancelled_by: 'service_provider',
            refund_reason: reason || 'Cancelled by Service Provider' 
          },
        });

        if (error) throw new Error(error.message);

        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, booking_status: 'processing' as any, refund_reason: reason } : b))
        );
      } else {
        // STANDARD DATABASE UPDATE: For completions or unpaid statuses
        const updatePayload: any = { 
          booking_status: newStatus, 
          updated_at: new Date().toISOString() 
        };
        
        // Route the text to the correct database column
        if (reason) {
          if (newStatus === 'rejected') {
            updatePayload.booking_rejection_reason = reason;
          } else if (newStatus === 'cancelled') {
            updatePayload.refund_reason = reason;
          }
        }

        const { error } = await supabase
          .from("booking_info")
          .update(updatePayload)
          .eq("id", id);

        if (error) throw new Error(error.message);

        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...updatePayload } : b))
        );
      }
      
      setSelectedBooking(null);
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || JSON.stringify(err)));
    }
  };

  const TAB_CARDS: { label: string; value: BookingStatus | 'all'; filter: string[] }[] = [
    { label: 'New Requests', value: 'pending_sp_response', filter: ['pending_sp_response'] },
    { label: 'Upcoming', value: 'paid', filter: ['approved', 'paid'] },
    { label: 'Completed', value: 'rated', filter: ['to_rate', 'rated'] },
    { label: 'Cancelled', value: 'cancelled', filter: ['cancelled', 'rejected', 'cancelled_by_po', 'processing', 'to_refund', 'refunded'] },
  ];

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const totalRevenue = bookings
    .filter(b => ['paid', 'to_rate', 'rated'].includes(b.booking_status))
    .reduce((sum, b) => sum + Number(b.booking_total_amount || 0), 0);

  const activeTabConfig = TAB_CARDS.find(t => t.value === activeTab);
  
  const filteredBookings = activeTab === 'all' 
    ? bookings 
    : bookings.filter(b => activeTabConfig?.filter.includes(b.booking_status as string));

  if (loading) {
    return <div className={styles.container}>Loading Dashboard...</div>;
  }

  return (
    <div>
      <div className={styles.container}>
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

        <div className={styles.tabsGrid}>
          <div
            onClick={() => setActiveTab('all')}
            className={`${styles.tabCard} ${activeTab === 'all' ? styles.tabCardActive : ''}`}
          >
            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>All Bookings</h3>
            <p className={styles.tabCount}>{bookings.length}</p>
          </div>

          {TAB_CARDS.map((tab) => {
            const count = bookings.filter(b => tab.filter.includes(b.booking_status as string)).length;
            const isActive = activeTab === tab.value;
            return (
              <div
                key={tab.value}
                onClick={() => setActiveTab(tab.value as BookingStatus | 'all')}
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
                    ?.flatMap((pet: any) => pet.booking_service_info?.map((s: any) => s.booking_service_name))
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
                        <span className={styles.statusBadge}>{formatStatus(booking.booking_status as BookingStatus)}</span>
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

        {/* Strict check: Only render if selectedBooking is not null */}
        {selectedBooking && (
          <BookingDetailsModal 
            selectedBooking={selectedBooking} 
            setSelectedBooking={setSelectedBooking} 
            handleUpdateStatus={handleUpdateStatus} 
          />
        )}

        {showCalendar && (
          <CalendarModal 
            bookings={bookings} 
            setShowCalendar={setShowCalendar} 
          />
        )}
      </div>

      <Footer />
    </div>
  );
}