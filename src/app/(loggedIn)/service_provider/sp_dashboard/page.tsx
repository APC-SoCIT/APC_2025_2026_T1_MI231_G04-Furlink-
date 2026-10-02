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
  
  // State for the sub-filter in the "All Bookings" tab
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // State for sorting the "New Requests" tab
  const [newRequestsSort, setNewRequestsSort] = useState<'urgent' | 'latest'>('urgent');
  
  // State for sorting the "Upcoming" tab
  const [upcomingSort, setUpcomingSort] = useState<'chronological' | 'farthest'>('chronological');
  
  // State for filtering the "Completed" tab by specific status (to_rate vs rated)
  const [completedStatusFilter, setCompletedStatusFilter] = useState<'all' | 'to_rate' | 'rated'>('all');

  // State for sorting the "Cancelled" tab
  const [cancelledSort, setCancelledSort] = useState<'booking_date' | 'refund_date'>('booking_date');
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Reset sub-filters whenever the user switches main tabs
  useEffect(() => {
    setStatusFilter('all');
    setNewRequestsSort('urgent');
    setUpcomingSort('chronological');
    setCompletedStatusFilter('all');
    setCancelledSort('booking_date');
  }, [activeTab]);

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
        const updatePayload: any = { 
          booking_status: newStatus, 
          updated_at: new Date().toISOString() 
        };
        
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
  
  // Base filtered bookings logic
  const baseFilteredBookings = activeTab === 'all' 
    ? bookings.filter(b => statusFilter === 'all' || b.booking_status === statusFilter)
    : bookings.filter(b => activeTabConfig?.filter.includes(b.booking_status as string));

  // Apply specific sorting or filtering based on the active tab
  const filteredBookings = activeTab === 'pending_sp_response'
    ? [...baseFilteredBookings].sort((a, b) => {
        if (newRequestsSort === 'urgent') {
          return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    : activeTab === 'paid'
    ? [...baseFilteredBookings].sort((a, b) => {
        const dateA = new Date(a.booking_date).getTime();
        const dateB = new Date(b.booking_date).getTime();
        if (upcomingSort === 'chronological') {
          return dateA - dateB;
        }
        return dateB - dateA;
      })
    : activeTab === 'rated'
    ? baseFilteredBookings.filter(b => completedStatusFilter === 'all' || b.booking_status === completedStatusFilter)
    : activeTab === 'cancelled'
    ? [...baseFilteredBookings].sort((a, b) => {
        // UPDATED: Handles most recent to least recent (Descending) sorting
        if (cancelledSort === 'refund_date') {
          // Fallback to 0 if null, pushing non-refunded items to the bottom of the descending list
          const dateA = (a as any).refund_initiated_at ? new Date((a as any).refund_initiated_at).getTime() : 0;
          const dateB = (b as any).refund_initiated_at ? new Date((b as any).refund_initiated_at).getTime() : 0;
          return dateB - dateA; 
        }
        // Descending for booking date
        return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
      })
    : baseFilteredBookings;

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
          <div className={styles.tableHeaderBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 'extrabold', textTransform: 'uppercase' }}>
              {activeTab === 'all' ? 'All Bookings' : activeTabConfig?.label}
            </h3>
            
            {/* Status Filter Dropdown (Only visible on All Bookings) */}
            {activeTab === 'all' && (
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">All Statuses</option>
                <option value="pending_sp_response">Pending Request</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="to_rate">To Rate</option>
                <option value="rated">Completed</option>
                <option value="to_refund">To Refund</option>
                <option value="refunded">Refunded</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}

            {/* Sort Filter Dropdown (Only visible on New Requests) */}
            {activeTab === 'pending_sp_response' && (
              <select 
                value={newRequestsSort}
                onChange={(e) => setNewRequestsSort(e.target.value as 'urgent' | 'latest')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none' }}
              >
                <option value="urgent">Sort by: Urgency (Closest Date)</option>
                <option value="latest">Sort by: Latest Request</option>
              </select>
            )}

            {/* Sort Filter Dropdown (Only visible on Upcoming tab) */}
            {activeTab === 'paid' && (
              <select 
                value={upcomingSort}
                onChange={(e) => setUpcomingSort(e.target.value as 'chronological' | 'farthest')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none' }}
              >
                <option value="chronological">Sort by: Upcoming First (Chronological)</option>
                <option value="farthest">Sort by: Farthest Date First</option>
              </select>
            )}

            {/* Status Filter Dropdown (Only visible on Completed tab) */}
            {activeTab === 'rated' && (
              <select 
                value={completedStatusFilter}
                onChange={(e) => setCompletedStatusFilter(e.target.value as 'all' | 'to_rate' | 'rated')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">All Completed</option>
                <option value="to_rate">To Rate</option>
                <option value="rated">Rated / Finished</option>
              </select>
            )}

            {/* Sort Filter Dropdown (Only visible on Cancelled tab) */}
            {activeTab === 'cancelled' && (
              <select 
                value={cancelledSort}
                onChange={(e) => setCancelledSort(e.target.value as 'booking_date' | 'refund_date')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none' }}
              >
                <option value="booking_date">Sort by: Booking Date</option>
                <option value="refund_date">Sort by: Refund Date</option>
              </select>
            )}
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date & Time</th>
                {/* Conditionally render Refund Date column header for Cancelled tab */}
                {activeTab === 'cancelled' && <th>Refund Date</th>}
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
                  {/* Dynamically adjust colSpan to handle the conditional column */}
                  <td colSpan={activeTab === 'cancelled' ? 7 : 6} style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>
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
                  
                  // Safely extract refund_initiated_at bypassing strict Booking type constraints if not updated yet
                  const refundDateRaw = (booking as any).refund_initiated_at;

                  return (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.booking_date}</strong>
                        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{booking.booking_timeslot}</div>
                      </td>
                      
                      {/* Conditionally render Refund Date cell data */}
                      {activeTab === 'cancelled' && (
                        <td>
                          <strong>{refundDateRaw ? new Date(refundDateRaw).toLocaleDateString() : 'N/A'}</strong>
                        </td>
                      )}
                      
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