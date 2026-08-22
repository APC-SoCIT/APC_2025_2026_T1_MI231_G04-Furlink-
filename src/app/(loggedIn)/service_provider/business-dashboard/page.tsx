'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaFileExcel } from 'react-icons/fa';
import { DashboardTab } from './type';
import { formatCurrency, formatTrend, formatLargeNumber } from './utils';
import Sidebar from './components/Sidebar';
import BusinessPerformance from './components/BusinessPerformance';
import SalesPerformance from './components/SalesPerformance';
import CustomerInsights from './components/CustomerInsights';
import Footer from '@/components/Footer'; 
import styles from './business-dashboard.module.css';

// Import your custom hook and analytics utility
import { useDashboardData } from '@/hooks/useDashboardData';
import { processBusinessPerformanceData } from '@/utils/analyticsCalculations';

export default function BusinessDashboardPage() {
  const supabase = createClientComponentClient();

  // Filter & Tab States
  const [activeTab, setActiveTab] = useState<DashboardTab>('business_performance');
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [petTypeFilter, setPetTypeFilter] = useState<'all' | 'dog' | 'cat'>('all');
  
  // Custom Date Range States
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');

  // Resolved Service Provider ID state
  const [spId, setSpId] = useState<string | null>(null);

  // 1. Resolve the logged-in user's sp_id on mount
  useEffect(() => {
    async function resolveProviderId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: providerData } = await supabase
        .from('sp_general_info')
        .select('id')
        .eq('profiles_id', user.id)
        .maybeSingle();

      if (providerData?.id) {
        setSpId(providerData.id);
      }
    }

    resolveProviderId();
  }, [supabase]);

  // 2. Consume your custom dashboard hook using the resolved spId
  const { bookings, pets, services, loading } = useDashboardData(spId || '');

  // 3. Filter bookings dynamically based on the selected timeframe sidebar filter
  const filteredBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    let startDate = new Date();
    if (timeFilter === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFilter === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeFilter === 'yearly') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (timeFilter === 'custom' && customDateStart) {
      startDate = new Date(customDateStart);
    }

    return bookings.filter((b: any) => {
      // Safely parse the database date
      const bDate = new Date(b.booking_date);
      
      if (timeFilter !== 'custom') {
        return bDate >= startDate;
      } else {
        const start = customDateStart ? new Date(customDateStart) : new Date(0);
        // Default to today if no end date is selected
        const end = customDateEnd ? new Date(customDateEnd) : new Date(); 
        return bDate >= start && bDate <= end;
      }
    });
  }, [bookings, timeFilter, customDateStart, customDateEnd]);

  // 4. Process real data for the Sidebar Doughnut Chart
  const sidebarAnalytics = useMemo(() => {
    return processBusinessPerformanceData(filteredBookings, pets, services);
  }, [filteredBookings, pets, services]);

  // 5. Calculate Real KPI Metrics from Supabase Data
  const dynamicMetrics = useMemo(() => {
    // Total bookings based on current timeframe filter
    const totalBookingsCount = filteredBookings.length;

    // Get all booking IDs currently in view
    const bookingIds = new Set(filteredBookings.map((b: any) => b.id));

    // Find all pets related to these filtered bookings
    const filteredPetIds = new Set(
      pets
        .filter((p: any) => bookingIds.has(p.booking_info_id))
        .map((p: any) => p.id)
    );

    // Find all services related to those filtered pets and sum their booking_price
    const filteredServices = services.filter((s: any) => filteredPetIds.has(s.booking_pet_info_id));
    
    const grossRevenue = filteredServices.reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);

    // Calculate Average per booking/customer safely
    const averageBookingValue = totalBookingsCount > 0 ? grossRevenue / totalBookingsCount : 0;

    // Count cancellations (assuming status field is 'cancelled', adjust if your status value differs)
    const cancellationsCount = filteredBookings.filter((b: any) => 
      b.booking_status?.toLowerCase() === 'cancelled'
    ).length;

    return {
      totalRevenue: grossRevenue,
      revenueTrend: 12.5, // Trend calculation can remain mocked or estimated if historical comparison data isn't pulled yet
      totalBookings: totalBookingsCount,
      bookingsTrend: 8.3,
      averageBookingValue: averageBookingValue,
      avgTrend: 0,
      cancellationsCount: cancellationsCount,
      cancelTrend:0,
      listingViews: 0, // Kept mocked since visitor logs don't exist in the database schema yet
      viewsTrend: 0,
    };
  }, [filteredBookings, pets, services]);

  // Get current date for the display header
  const currentDate = new Date();
  const dateDisplay = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const renderTrendIcon = (value: number) => {
    if (value > 0) return '📈';
    if (value < 0) return '📉';
    return '➡️';
  };

  const getTrendClass = (value: number) => {
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  // --- DEBUGGING LOGS ---
  console.log("1. Resolved Provider ID (spId):", spId);
  console.log("2. Raw Data from Hook (bookings):", bookings);
  console.log("3. Filtered Data for Charts (filteredBookings):", filteredBookings);
  console.log("4. Dynamic Metrics Calculated:", dynamicMetrics);
  // ----------------------

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainLayout}>
        <div className={styles.container}>
          
          {/* Sidebar Navigation & Filters */}
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            petTypeFilter={petTypeFilter}
            setPetTypeFilter={setPetTypeFilter}
            customDateStart={customDateStart}
            setCustomDateStart={setCustomDateStart}
            customDateEnd={customDateEnd}
            setCustomDateEnd={setCustomDateEnd}
            bookedServices={sidebarAnalytics.serviceBreakdown}
          />

          {/* Main Content Area */}
          <div className={styles.contentArea}>
            
            {/* Header with Date and Report Button */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h1 className={styles.title}>
                  {activeTab === 'business_performance' && 'Business Performance'}
                  {activeTab === 'sales' && 'Sales Performance'}
                  {activeTab === 'customer_insights' && 'Customer Insights'}
                </h1>
                <p className={styles.dateDisplay}>As of {dateDisplay}</p>
              </div>
              <button className={styles.reportButton} title="Generate Sales Report (coming soon)">
                <FaFileExcel size={16} />
                Generate Sales Report
              </button>
            </div>

            {/* Dashboard Body (KPIs, Charts) */}
            <div className={styles.dashboardBody}>
              
              {/* Key Metrics Grid */}
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Gross Revenue</div>
                  <div className={styles.metricValue}>{formatCurrency(dynamicMetrics.totalRevenue)}</div>
                  <div className={styles.metricTrend}>
                    <span>{renderTrendIcon(dynamicMetrics.revenueTrend)}</span>
                    <span className={getTrendClass(dynamicMetrics.revenueTrend)}>
                      {formatTrend(dynamicMetrics.revenueTrend)}
                    </span>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Total Completed Bookings</div>
                  <div className={styles.metricValue}>{dynamicMetrics.totalBookings}</div>
                  <div className={styles.metricTrend}>
                    <span>{renderTrendIcon(dynamicMetrics.bookingsTrend)}</span>
                    <span className={getTrendClass(dynamicMetrics.bookingsTrend)}>
                      {formatTrend(dynamicMetrics.bookingsTrend)}
                    </span>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Listing Visitors</div>
                  <div className={styles.metricValue}>{formatLargeNumber(dynamicMetrics.listingViews)}</div>
                  <div className={styles.metricTrend}>
                    <span>{renderTrendIcon(dynamicMetrics.viewsTrend)}</span>
                    <span className={getTrendClass(dynamicMetrics.viewsTrend)}>
                      {formatTrend(dynamicMetrics.viewsTrend)}
                    </span>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Avg/Customer</div>
                  <div className={styles.metricValue}>{formatCurrency(dynamicMetrics.averageBookingValue)}</div>
                  <div className={styles.metricTrend}>
                    <span>➡️</span>
                    <span className={styles.trendNeutral}>0%</span>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Cancellations</div>
                  <div className={styles.metricValue}>{dynamicMetrics.cancellationsCount.toString().padStart(2, '0')}</div>
                  <div className={styles.metricTrend}>
                    <span>{renderTrendIcon(dynamicMetrics.cancelTrend)}</span>
                    <span className={getTrendClass(dynamicMetrics.cancelTrend)}>
                      {formatTrend(Math.abs(dynamicMetrics.cancelTrend))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab Content Rendering */}
              {activeTab === 'business_performance' && (
                <BusinessPerformance 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter} 
                  bookings={filteredBookings} 
                  pets={pets} 
                  services={services} 
                />
              )}

              {activeTab === 'sales' && (
                <SalesPerformance 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter}
                  bookings={filteredBookings} 
                  pets={pets} 
                  services={services} 
                />
              )}

              {/* Updated CustomerInsights with database props */}
              {activeTab === 'customer_insights' && (
                <CustomerInsights 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter} 
                  bookings={filteredBookings} 
                  pets={pets} 
                />
              )}

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}