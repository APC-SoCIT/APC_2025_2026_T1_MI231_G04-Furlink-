'use client';

import React, { useState } from 'react';
import { FaFileExcel } from 'react-icons/fa';
import { DashboardTab } from './type';
import { formatCurrency, formatTrend, getTrendDirection, formatLargeNumber } from './utils';
import Sidebar from './components/Sidebar';
import BusinessPerformance from './components/BusinessPerformance';
import SalesPerformance from './components/SalesPerformance';
import CustomerInsights from './components/CustomerInsights';
import styles from './business-dashboard.module.css';

export default function BusinessDashboardPage() {
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

  // Mock data - will be replaced with Supabase data later
  const mockMetrics = {
    totalRevenue: 28500.00,
    revenueTrend: 12.5,
    totalBookings: 45,
    bookingsTrend: 8.3,
    averageBookingValue: 633.33,
    avgTrend: 3.7,
    cancellationRate: 4.4,
    cancelTrend: -2.1,
    listingViews: 1250,
    viewsTrend: 22.5,
    averageRating: 4.6,
    ratingTrend: 5.0,
  };

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
              <div className={styles.metricValue}>{formatCurrency(mockMetrics.totalRevenue)}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(mockMetrics.revenueTrend)}</span>
                <span className={getTrendClass(mockMetrics.revenueTrend)}>
                  {formatTrend(mockMetrics.revenueTrend)}
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Total Completed Bookings</div>
              <div className={styles.metricValue}>{mockMetrics.totalBookings}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(mockMetrics.bookingsTrend)}</span>
                <span className={getTrendClass(mockMetrics.bookingsTrend)}>
                  {formatTrend(mockMetrics.bookingsTrend)}
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Listing Visitors</div>
              <div className={styles.metricValue}>{formatLargeNumber(mockMetrics.listingViews)}</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(mockMetrics.viewsTrend)}</span>
                <span className={getTrendClass(mockMetrics.viewsTrend)}>
                  {formatTrend(mockMetrics.viewsTrend)}
                </span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Avg/Customer</div>
              <div className={styles.metricValue}>₱0</div>
              <div className={styles.metricTrend}>
                <span>➡️</span>
                <span className={styles.trendNeutral}>0%</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Cancellations</div>
              <div className={styles.metricValue}>00</div>
              <div className={styles.metricTrend}>
                <span>{renderTrendIcon(mockMetrics.cancelTrend)}</span>
                <span className={getTrendClass(mockMetrics.cancelTrend)}>
                  {formatTrend(Math.abs(mockMetrics.cancelTrend))}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Content - Render Based on Active Tab */}
          {activeTab === 'business_performance' && (
            <BusinessPerformance timeFilter={timeFilter} petTypeFilter={petTypeFilter} />
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