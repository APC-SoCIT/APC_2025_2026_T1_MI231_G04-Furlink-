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

import { useDashboardData } from '@/hooks/useDashboardData';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { BusinessReportPDF } from './components/pdf-reports/BusinessReportPDF';
import { CustomerInsightPDF } from './components/pdf-reports/CustomerInsightPDF';
import { SalesReportPDF } from './components/pdf-reports/SalesReportPDF'; 

import ReportPreviewModal from './components/ReportPreviewModal';

export default function BusinessDashboardPage() {
  const supabase = createClientComponentClient();

  const [activeTab, setActiveTab] = useState<DashboardTab>('business_performance');
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [petTypeFilter, setPetTypeFilter] = useState<'all' | 'dog' | 'cat'>('all');
  
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');

  const [spId, setSpId] = useState<string | null>(null);
  const [profileViewCount, setProfileViewCount] = useState<number>(0); // State for Listing Visitors
  const [isClient, setIsClient] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); 

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Resolve the logged-in user's sp_id and business_profile_view_count on mount
  useEffect(() => {
    async function resolveProviderId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: providerData } = await supabase
        .from('sp_general_info')
        .select('id, business_profile_view_count')
        .eq('profiles_id', user.id)
        .maybeSingle();

      if (providerData?.id) {
        setSpId(providerData.id);
        setProfileViewCount(providerData.business_profile_view_count || 0);
      }
    }

    resolveProviderId();
  }, [supabase]);

  const { bookings, pets, services, loading } = useDashboardData(spId || '');

  // 1. Strict Business Status & Date Filter
  const baseFilteredBookings = useMemo(() => {
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
      const validStatuses = ['paid', 'to_rate', 'rated', 'cancelled'];
      if (!validStatuses.includes(b.booking_status?.toLowerCase())) {
        return false;
      }

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

  // 2. Pet Type Filter
  const { filteredBookings, filteredPets, filteredServices } = useMemo(() => {
    let currentPets = pets || [];
    
    if (petTypeFilter !== 'all') {
      currentPets = currentPets.filter((p: any) => p.booking_pet_type?.toLowerCase() === petTypeFilter);
    }

    const validPetIds = new Set(currentPets.map((p: any) => p.id));
    const currentServices = (services || []).filter((s: any) => validPetIds.has(s.booking_pet_info_id));

    let currentBookings = baseFilteredBookings || [];
    if (petTypeFilter !== 'all') {
      const validBookingIds = new Set(currentPets.map((p: any) => p.booking_info_id));
      currentBookings = currentBookings.filter((b: any) => validBookingIds.has(b.id));
    }

    return { 
      filteredBookings: currentBookings, 
      filteredPets: currentPets, 
      filteredServices: currentServices 
    };
  }, [baseFilteredBookings, pets, services, petTypeFilter]);

  // Calculate Real KPI Metrics & Service Breakdown from fully filtered data
  const dynamicMetrics = useMemo(() => {
    const completedBookings = filteredBookings.filter((b: any) => 
      ['to_rate', 'rated'].includes(b.booking_status?.toLowerCase())
    );

    const revenueBookings = filteredBookings.filter((b: any) => 
      ['paid', 'to_rate', 'rated'].includes(b.booking_status?.toLowerCase())
    );

    const cancelledBookings = filteredBookings.filter((b: any) => 
      b.booking_status?.toLowerCase() === 'cancelled'
    );

    const revenueBookingIds = new Set(revenueBookings.map((b: any) => b.id));

    const revenuePetIds = new Set(
      filteredPets
        .filter((p: any) => revenueBookingIds.has(p.booking_info_id))
        .map((p: any) => p.id)
    );

    const revenueGeneratingServices = filteredServices.filter((s: any) => revenuePetIds.has(s.booking_pet_info_id));
    const grossRevenue = revenueGeneratingServices.reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);
    
    const serviceCounts: Record<string, number> = {};
    let totalValidServices = 0;
    
    revenueGeneratingServices.forEach((s: any) => {
      const name = s.booking_service_name;
      if (name) {
        serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        totalValidServices++;
      }
    });

    const realServiceBreakdown = Object.entries(serviceCounts)
      .map(([name, count]) => ({
        name,
        bookings: count,
        percentage: totalValidServices > 0 ? Math.round((count / totalValidServices) * 100) : 0
      }))
      .sort((a, b) => b.bookings - a.bookings);

    const averageBookingValue = revenueBookings.length > 0 ? grossRevenue / revenueBookings.length : 0;

    // Calculate peak time slot from filtered bookings using booking_timeslot
    const timeCounts: Record<string, number> = {};
    filteredBookings.forEach((b: any) => {
      const timeslot = b.booking_timeslot || '';
      if (timeslot) {
        timeCounts[timeslot] = (timeCounts[timeslot] || 0) + 1;
      }
    });

    let peakActivityTime = 'No data';
    let maxBookings = 0;
    Object.entries(timeCounts).forEach(([time, count]) => {
      if (count > maxBookings) {
        maxBookings = count;
        peakActivityTime = time;
      }
    });

    return {
      totalRevenue: grossRevenue,
      revenueTrend: 12.5, 
      totalBookings: completedBookings.length, 
      bookingsTrend: 8.3,
      averageBookingValue: averageBookingValue,
      avgTrend: 0,
      cancellationsCount: cancelledBookings.length,
      cancelTrend: 0,
      listingViews: profileViewCount, // Pulled directly from database column!
      viewsTrend: 0,
      realServiceBreakdown,
      peakActivity: peakActivityTime 
    };
  }, [filteredBookings, filteredPets, filteredServices, profileViewCount]);

  const currentDate = new Date();
  const dateDisplay = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const reportPeriodLabel = timeFilter === 'custom' && customDateStart 
    ? `${customDateStart} to ${customDateEnd || 'Present'}` 
    : timeFilter;

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
          document: (
            <CustomerInsightPDF 
              bookings={filteredBookings} 
              pets={filteredPets} 
              month={reportPeriodLabel} 
              petTypeFilter={petTypeFilter} 
              totalRevenue={dynamicMetrics.totalRevenue}
            />
          ),
          fileName: `Customer_Insight_Report_${currentDate.toISOString().split('T')[0]}.pdf`,
          label: "Generate Customer Insight Report"
        };
      case 'business_performance':
      default:
        return {
          document: (
            <BusinessReportPDF 
              bookings={filteredBookings} 
              pets={filteredPets} 
              services={filteredServices} 
              totalRevenue={dynamicMetrics.totalRevenue} 
              month={reportPeriodLabel} 
              petTypeFilter={petTypeFilter} 
              peakActivity={dynamicMetrics.peakActivity}
            />
          ),
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
            bookedServices={dynamicMetrics.realServiceBreakdown} 
          />

          <div className={styles.contentArea}>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <h1 className={styles.title}>
                  {activeTab === 'business_performance' && 'Business Performance'}
                  {activeTab === 'sales' && 'Sales Performance'}
                  {activeTab === 'customer_insights' && 'Customer Insights'}
                </h1>
                <p className={styles.dateDisplay}>As of {dateDisplay}</p>
              </div>

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

            <div className={styles.dashboardBody}>
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

              {activeTab === 'business_performance' && (
                <BusinessPerformance 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter} 
                  bookings={filteredBookings} 
                  pets={filteredPets} 
                  services={filteredServices} 
                />
              )}

              {activeTab === 'sales' && (
                <SalesPerformance 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter} 
                  bookings={filteredBookings} 
                  pets={filteredPets} 
                  services={filteredServices} 
                />
              )}

              {activeTab === 'customer_insights' && (
                <CustomerInsights 
                  timeFilter={timeFilter} 
                  petTypeFilter={petTypeFilter} 
                  bookings={filteredBookings} 
                  pets={filteredPets} 
                />
              )}

            </div>
          </div>
        </div>
      </div>

      <Footer />

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
        bookingsData={filteredBookings}
        petsData={filteredPets}
        servicesData={filteredServices}
        peakActivity={dynamicMetrics.peakActivity}
      />
    </div>
  );
}