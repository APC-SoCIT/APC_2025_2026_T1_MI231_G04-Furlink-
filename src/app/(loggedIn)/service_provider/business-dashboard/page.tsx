'use client';

import React, { useState, useMemo } from 'react';
import { FaFileExcel } from 'react-icons/fa';
import { DashboardTab } from './type';
import { formatCurrency, formatTrend, getTrendDirection, formatLargeNumber } from './utils';
import { useDashboardData } from '@/hooks/useDashboardData';
import Sidebar from './components/Sidebar';
import BusinessPerformance from './components/BusinessPerformance';
import SalesPerformance from './components/SalesPerformance';
import CustomerInsights from './components/CustomerInsights';
import styles from './business-dashboard.module.css';

export default function BusinessDashboardPage() {
  // Replace with the authenticated service provider's actual ID/UUID context
  const spId = 'YOUR_SERVICE_PROVIDER_UUID'; 
  const { bookings, pets, services, generalInfo, loading } = useDashboardData(spId);

  // State management
  const [activeTab, setActiveTab] = useState<DashboardTab>('business_performance');
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [petTypeFilter, setPetTypeFilter] = useState<'all' | 'dog' | 'cat'>('all');

  // Get current date
  const currentDate = new Date();
  const dateDisplay = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate real KPI metrics from Supabase tables
  const kpiMetrics = useMemo(() => {
    const safeBookings = Array.isArray(bookings) ? bookings : [];

    // Filter statuses
    const completedStatuses = ['approved', 'paid', 'to_rate', 'rated'];
    const completedBookingsList = safeBookings.filter((b) => completedStatuses.includes(b.booking_status));
    const cancelledBookingsList = safeBookings.filter((b) => b.booking_status === 'cancelled' || b.booking_status === 'rejected');

    // 1. Gross Revenue (sum of booking_total_amount for completed/paid bookings)
    const totalRevenue = completedBookingsList.reduce((sum, b) => sum + Number(b.booking_total_amount || 0), 0);

    // 2. Total Completed Bookings count
    const totalBookings = completedBookingsList.length;

    // 3. Listing Visitors from sp_general_info table
    const listingViews = generalInfo?.business_profile_view_count || 0;

    // 4. Average per Customer
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // 5. Cancellations count
    const cancellationsCount = cancelledBookingsList.length;

    return {
      totalRevenue,
      totalBookings,
      listingViews,
      averageBookingValue,
      cancellationsCount,
    };
  }, [bookings, generalInfo]);

  // Render trend icon
  const renderTrendIcon = (value: number) => {
    if (value > 0) return '📈';
    if (value < 0) return '📉';
    return '➡️';
  };

  // Render trend class
  const getTrendClass = (value: number) => {
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading dashboard metrics...</div>;
  }

  return (
    <div className={styles.mainLayout}>
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
          <div className={styles.headerRight}>
            <button className={styles.reportButton} title="Generate Sales Report (coming soon)">
              <FaFileExcel size={16} />
              Generate Sales Report
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.container}>
          {/* Filter Controls */}
          <div className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Time Period</label>
              <select
                className={styles.filterSelect}
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as 'weekly' | 'monthly' | 'yearly')}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Pet Type</label>
              <select
                className={styles.filterSelect}
                value={petTypeFilter}
                onChange={(e) => setPetTypeFilter(e.target.value as 'all' | 'dog' | 'cat')}
              >
                <option value="all">Both (Dog & Cat)</option>
                <option value="dog">Dogs Only</option>
                <option value="cat">Cats Only</option>
              </select>
            </div>
          </div>

          {/* Key Metrics Grid - Always Visible */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Gross Revenue</div>
              <div className={styles.metricValue}>{formatCurrency(kpiMetrics.totalRevenue)}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(12.5)}</span>
                <span className={getTrendClass(12.5)}>
                  {formatTrend(12.5)}
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Total Completed Bookings</div>
              <div className={styles.metricValue}>{kpiMetrics.totalBookings}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(8.3)}</span>
                <span className={getTrendClass(8.3)}>
                  {formatTrend(8.3)}
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Listing Visitors</div>
              <div className={styles.metricValue}>{formatLargeNumber(kpiMetrics.listingViews)}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(22.5)}</span>
                <span className={getTrendClass(22.5)}>
                  {formatTrend(22.5)}
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Avg/Customer</div>
              <div className={styles.metricValue}>{formatCurrency(kpiMetrics.averageBookingValue)}</div>
              <div className={styles.metricTrend}>
                <span>➡️</span>
                <span className={styles.trendNeutral}>0%</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Cancellations</div>
              <div className={styles.metricValue}>{kpiMetrics.cancellationsCount}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(-2.1)}</span>
                <span className={getTrendClass(-2.1)}>
                  {formatTrend(2.1)}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Content - Render Based on Active Tab */}
          {activeTab === 'business_performance' && (
            <BusinessPerformance 
              timeFilter={timeFilter} 
              petTypeFilter={petTypeFilter} 
              bookings={bookings}
              pets={pets}
              services={services}
            />
          )}

          {activeTab === 'sales' && (
            <SalesPerformance timeFilter={timeFilter} petTypeFilter={petTypeFilter} />
          )}

          {activeTab === 'customer_insights' && (
            <CustomerInsights timeFilter={timeFilter} petTypeFilter={petTypeFilter} />
          )}
        </div>
      </div>
    </div>
  );
}