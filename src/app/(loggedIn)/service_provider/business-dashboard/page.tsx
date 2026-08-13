'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaCaretUp, FaCaretDown, FaMinus } from 'react-icons/fa';
import { DashboardTab } from './type';
import { formatCurrency, formatTrend, getTrendDirection, formatLargeNumber } from './utils';
import BusinessPerformance from './components/BusinessPerformance';
import SalesPerformance from './components/SalesPerformance';
import styles from './business-dashboard.module.css';

export default function BusinessDashboardPage() {
  // State management
  const [activeTab, setActiveTab] = useState<DashboardTab>('business_performance');
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [petTypeFilter, setPetTypeFilter] = useState<'all' | 'dog' | 'cat'>('all');

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
    if (value > 0) return <FaCaretUp style={{ color: '#16a34a' }} />;
    if (value < 0) return <FaCaretDown style={{ color: '#dc2626' }} />;
    return <FaMinus style={{ color: '#64748b' }} />;
  };

  // Render trend class
  const getTrendClass = (value: number) => {
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  return (
    <div className={styles.container}>
      {/* Header with Back Button */}
      <div className={styles.header}>
        <h1 className={styles.title}>Business Dashboard</h1>
        <Link href="/sp_dashboard">
          <button className={styles.backButton}>
            <FaArrowLeft style={{ marginRight: '0.5rem' }} />
            Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'business_performance' ? styles.active : ''}`}
          onClick={() => setActiveTab('business_performance')}
        >
          Business Performance
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'sales' ? styles.active : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Sales
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'customer_insights' ? styles.active : ''}`}
          onClick={() => setActiveTab('customer_insights')}
        >
          Customer Insights
        </button>
      </div>

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
            <option value="all">All Pets</option>
            <option value="dog">Dogs Only</option>
            <option value="cat">Cats Only</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid - Always Visible */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Revenue</div>
          <div className={styles.metricValue}>{formatCurrency(mockMetrics.totalRevenue)}</div>
          <div className={styles.metricTrend}>
            {renderTrendIcon(mockMetrics.revenueTrend)}
            <span className={getTrendClass(mockMetrics.revenueTrend)}>
              {formatTrend(mockMetrics.revenueTrend)} vs last period
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Bookings</div>
          <div className={styles.metricValue}>{mockMetrics.totalBookings}</div>
          <div className={styles.metricTrend}>
            {renderTrendIcon(mockMetrics.bookingsTrend)}
            <span className={getTrendClass(mockMetrics.bookingsTrend)}>
              {formatTrend(mockMetrics.bookingsTrend)} vs last period
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Avg Booking Value</div>
          <div className={styles.metricValue}>{formatCurrency(mockMetrics.averageBookingValue)}</div>
          <div className={styles.metricTrend}>
            {renderTrendIcon(mockMetrics.avgTrend)}
            <span className={getTrendClass(mockMetrics.avgTrend)}>
              {formatTrend(mockMetrics.avgTrend)} vs last period
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Cancellation Rate</div>
          <div className={styles.metricValue}>{mockMetrics.cancellationRate}%</div>
          <div className={styles.metricTrend}>
            {renderTrendIcon(mockMetrics.cancelTrend)}
            <span className={getTrendClass(mockMetrics.cancelTrend)}>
              {formatTrend(Math.abs(mockMetrics.cancelTrend))} vs last period
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Listing Views</div>
          <div className={styles.metricValue}>{formatLargeNumber(mockMetrics.listingViews)}</div>
          <div className={styles.metricTrend}>
            {renderTrendIcon(mockMetrics.viewsTrend)}
            <span className={getTrendClass(mockMetrics.viewsTrend)}>
              {formatTrend(mockMetrics.viewsTrend)} vs last period
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Average Rating</div>
          <div className={styles.metricValue}>{mockMetrics.averageRating}/5.0</div>
          <div className={styles.metricTrend}>
            {renderTrendIcon(mockMetrics.ratingTrend)}
            <span className={getTrendClass(mockMetrics.ratingTrend)}>
              {formatTrend(mockMetrics.ratingTrend)} vs last period
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
  );
}