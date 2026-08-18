'use client';

import React, { useState } from 'react';
import { FaFileExcel } from 'react-icons/fa';
import { DashboardTab } from './type';
import { formatCurrency, formatTrend, formatLargeNumber } from './utils';
import Sidebar from './components/Sidebar';
import BusinessPerformance from './components/BusinessPerformance';
import SalesPerformance from './components/SalesPerformance';
import CustomerInsights from './components/CustomerInsights';
import Footer from '@/components/Footer'; 
import styles from './business-dashboard.module.css';

export default function BusinessDashboardPage() {
  // Filter & Tab States
  const [activeTab, setActiveTab] = useState<DashboardTab>('business_performance');
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [petTypeFilter, setPetTypeFilter] = useState<'all' | 'dog' | 'cat'>('all');
  
  // Custom Date Range States
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');

  // Get current date for the display header
  const currentDate = new Date();
  const dateDisplay = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Mock data for Phase 1 CSS testing
  const mockMetrics = {
    totalRevenue: 28500.00,
    revenueTrend: 12.5,
    totalBookings: 45,
    bookingsTrend: 8.3,
    averageBookingValue: 633.33,
    avgTrend: 0,
    cancellationsCount: 2,
    cancelTrend: -2.1,
    listingViews: 1250,
    viewsTrend: 22.5,
  };

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
                  <div className={styles.metricValue}>{formatCurrency(mockMetrics.averageBookingValue)}</div>
                  <div className={styles.metricTrend}>
                    <span>➡️</span>
                    <span className={styles.trendNeutral}>0%</span>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Cancellations</div>
                  <div className={styles.metricValue}>{mockMetrics.cancellationsCount.toString().padStart(2, '0')}</div>
                  <div className={styles.metricTrend}>
                    <span>{renderTrendIcon(mockMetrics.cancelTrend)}</span>
                    <span className={getTrendClass(mockMetrics.cancelTrend)}>
                      {formatTrend(Math.abs(mockMetrics.cancelTrend))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab Content Rendering */}
              {activeTab === 'business_performance' && (
                <BusinessPerformance 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter} 
                  bookings={[]} 
                  pets={[]} 
                  services={[]} 
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
      </div>

      <Footer />
    </div>
  );
}