'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaFileExcel } from 'react-icons/fa'; // (You can optionally change this to FaFilePdf if you import it!)
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

// Import PDF Renderer and your specific report templates
import { PDFDownloadLink } from '@react-pdf/renderer';
import { BusinessReportPDF } from './components/pdf-reports/BusinessReportPDF';
import { CustomerInsightPDF } from './components/pdf-reports/CustomerInsightPDF';
import { SalesReportPDF } from './components/pdf-reports/SalesReportPDF'; 

// Import the new Preview Modal
import ReportPreviewModal from './components/ReportPreviewModal';

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

  // Client-side rendering & Modal states
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Controls the preview modal visibility

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resolve the logged-in user's sp_id on mount
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

  // Consume your custom dashboard hook using the resolved spId
  const { bookings, pets, services, loading } = useDashboardData(spId || '');

  // Filter bookings dynamically based on the selected timeframe sidebar filter
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
      const bDate = new Date(b.booking_date);
      
      if (timeFilter !== 'custom') {
        return bDate >= startDate;
      } else {
        const start = customDateStart ? new Date(customDateStart) : new Date(0);
        const end = customDateEnd ? new Date(customDateEnd) : new Date(); 
        return bDate >= start && bDate <= end;
      }
    });
  }, [bookings, timeFilter, customDateStart, customDateEnd]);

  // Process real data for the Sidebar Doughnut Chart
  const sidebarAnalytics = useMemo(() => {
    return processBusinessPerformanceData(filteredBookings, pets, services);
  }, [filteredBookings, pets, services]);

  // Calculate Real KPI Metrics from Supabase Data
  const dynamicMetrics = useMemo(() => {
    const totalBookingsCount = filteredBookings.length;
    const bookingIds = new Set(filteredBookings.map((b: any) => b.id));

    const filteredPetIds = new Set(
      pets
        .filter((p: any) => bookingIds.has(p.booking_info_id))
        .map((p: any) => p.id)
    );

    const filteredServices = services.filter((s: any) => filteredPetIds.has(s.booking_pet_info_id));
    const grossRevenue = filteredServices.reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);
    const averageBookingValue = totalBookingsCount > 0 ? grossRevenue / totalBookingsCount : 0;

    const cancellationsCount = filteredBookings.filter((b: any) => 
      b.booking_status?.toLowerCase() === 'cancelled' || b.booking_status?.toLowerCase() === 'rejected'
    ).length;

    return {
      totalRevenue: grossRevenue,
      revenueTrend: 12.5, 
      totalBookings: totalBookingsCount,
      bookingsTrend: 8.3,
      averageBookingValue: averageBookingValue,
      avgTrend: 0,
      cancellationsCount: cancellationsCount,
      cancelTrend:0,
      listingViews: 0, 
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

  // Format the date label for the PDF metadata & Modal based on your filters
  const reportPeriodLabel = timeFilter === 'custom' && customDateStart 
    ? `${customDateStart} to ${customDateEnd || 'Present'}` 
    : timeFilter;

  // Determine which PDF to render based on activeTab
  const getPDFConfig = () => {
    switch (activeTab) {
      case 'sales':
        return {
          document: <SalesReportPDF bookings={filteredBookings} totalRevenue={dynamicMetrics.totalRevenue} month={reportPeriodLabel} petTypeFilter={petTypeFilter} />,
          fileName: `Sales_Report_${currentDate.toISOString().split('T')[0]}.pdf`,
          label: "Generate Sales Report"
        };
      case 'customer_insights':
        return {
          document: <CustomerInsightPDF bookings={filteredBookings} month={reportPeriodLabel} petTypeFilter={petTypeFilter} />,
          fileName: `Customer_Insight_Report_${currentDate.toISOString().split('T')[0]}.pdf`,
          label: "Generate Customer Insight Report"
        };
      case 'business_performance':
      default:
        return {
          document: <BusinessReportPDF bookings={filteredBookings} totalRevenue={dynamicMetrics.totalRevenue} month={reportPeriodLabel} petTypeFilter={petTypeFilter} />,
          fileName: `Business_Report_${currentDate.toISOString().split('T')[0]}.pdf`,
          label: "Generate Business Report"
        };
    }
  };

  const currentPdfConfig = getPDFConfig();

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
            bookedServices={sidebarAnalytics.serviceBreakdown}
          />

          {/* Main Content Area */}
          <div className={styles.contentArea}>
            
            {/* Header with Date and ADAPTIVE Report Modal Trigger */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h1 className={styles.title}>
                  {activeTab === 'business_performance' && 'Business Performance'}
                  {activeTab === 'sales' && 'Sales Performance'}
                  {activeTab === 'customer_insights' && 'Customer Insights'}
                </h1>
                <p className={styles.dateDisplay}>As of {dateDisplay}</p>
              </div>

              {/* Triggers the Preview Modal instead of downloading immediately */}
              {isClient ? (
                <button 
                  className={styles.reportButton} 
                  title={currentPdfConfig.label}
                  onClick={() => setIsModalOpen(true)}
                >
                  <FaFileExcel size={16} />
                  {currentPdfConfig.label}
                </button>
              ) : (
                <button className={styles.reportButton} disabled>
                  <FaFileExcel size={16} /> Loading Generator...
                </button>
              )}
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

      {/* Report Preview Modal rendered cleanly outside the main flow */}
      <ReportPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentPdfConfig.label.replace('Generate ', '')}
        pdfDocument={currentPdfConfig.document}
        fileName={currentPdfConfig.fileName}
        reportPeriod={reportPeriodLabel}
        petTypeFilter={petTypeFilter === 'all' ? 'All Pets (Dog & Cat)' : petTypeFilter}
        metrics={{
          revenue: dynamicMetrics.totalRevenue,
          bookings: dynamicMetrics.totalBookings,
          cancellations: dynamicMetrics.cancellationsCount,
          visitors: dynamicMetrics.listingViews,
          avgCustomer: dynamicMetrics.averageBookingValue

        }}
      />
    </div>
  );
}