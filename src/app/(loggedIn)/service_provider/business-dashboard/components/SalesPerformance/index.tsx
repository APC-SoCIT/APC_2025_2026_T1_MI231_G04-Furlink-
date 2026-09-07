import React, { useMemo } from 'react';
import OverallSalesChart from './components/OverallSalesChart';
import RevenueLossChart from './components/RevenueLossChart';
import NewVsReturningChart from './components/NewVsReturningChart';
import ServicePerformanceChart from './components/ServicePerformanceChart';
import styles from '../../business-dashboard.module.css';

interface SalesPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'custom';
  petTypeFilter: 'all' | 'dog' | 'cat';
  bookings: any[];
  pets: any[];
  services: any[];
}

export default function SalesPerformance({ 
  timeFilter, 
  petTypeFilter, 
  bookings, 
  pets, 
  services 
}: SalesPerformanceProps) {

  // Map booking IDs and filter relevant service items
  const analyticsData = useMemo(() => {
    const bookingIds = new Set(bookings.map((b: any) => b.id));
    
    const relevantPets = pets.filter((p: any) => bookingIds.has(p.booking_info_id));
    const petIdSet = new Set(relevantPets.map((p: any) => p.id));
    
    const relevantServices = services.filter((s: any) => petIdSet.has(s.booking_pet_info_id));

    // Group sales into 4 chunks (weeks or intervals) for the line charts
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const totalRevenueBuckets = [0, 0, 0, 0];
    const potentialRevenueBuckets = [0, 0, 0, 0];
    const actualRevenueBuckets = [0, 0, 0, 0];
    const newCustomerBuckets = [0, 0, 0, 0];
    const returningCustomerBuckets = [0, 0, 0, 0];

    let overallTotalRevenue = 0;
    let overallTotalLoss = 0;

    // Service aggregation map for the chart
    const serviceMap: { [key: string]: { revenue: number; bookings: number } } = {};

    bookings.forEach((booking: any) => {
      // Determine bucket index (divide booking index or spread across 4 buckets)
      const bDate = new Date(booking.booking_date || Date.now());
      const dayOfMonth = bDate.getDate();
      let bucketIdx = Math.min(Math.floor((dayOfMonth - 1) / 8), 3);
      if (bucketIdx < 0) bucketIdx = 0;

      // Find services for this booking
      const bPets = relevantPets.filter((p: any) => p.booking_info_id === booking.id);
      const bPetIds = new Set(bPets.map((p: any) => p.id));
      const bServices = relevantServices.filter((s: any) => bPetIds.has(s.booking_pet_info_id));

      let bookingRevenue = 0;
      bServices.forEach((srv: any) => {
        const price = Number(srv.booking_price || 0);
        bookingRevenue += price;

        const sName = srv.booking_service_name || 'General Service';
        if (!serviceMap[sName]) {
          serviceMap[sName] = { revenue: 0, bookings: 0 };
        }
        serviceMap[sName].revenue += price;
        serviceMap[sName].bookings += 1;
      });

      const isCancelled = booking.booking_status?.toLowerCase() === 'cancelled';

      potentialRevenueBuckets[bucketIdx] += bookingRevenue;

      if (isCancelled) {
        overallTotalLoss += bookingRevenue;
      } else {
        actualRevenueBuckets[bucketIdx] += bookingRevenue;
        totalRevenueBuckets[bucketIdx] += bookingRevenue;
        overallTotalRevenue += bookingRevenue;

        // Mock split for new vs returning customer revenue based on ID string parity
        // (Since a true 'returning customer' tracker doesn't exist in the DB schema yet)
        if (booking.id.charCodeAt(0) % 2 === 0) {
          newCustomerBuckets[bucketIdx] += bookingRevenue;
        } else {
          returningCustomerBuckets[bucketIdx] += bookingRevenue;
        }
      }
    });

    // Format top services list for chart
    const serviceNamesArr = Object.keys(serviceMap);
    const serviceRevenueArr = serviceNamesArr.map(name => serviceMap[name].revenue);
    const serviceColors = ['#1e3a8a', '#facc15', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

    return {
      salesData: {
        labels,
        totalRevenue: totalRevenueBuckets,
        potentialRevenue: potentialRevenueBuckets,
        actualRevenue: actualRevenueBuckets,
        newCustomerRevenue: newCustomerBuckets,
        returningCustomerRevenue: returningCustomerBuckets,
      },
      serviceData: {
        names: serviceNamesArr.length > 0 ? serviceNamesArr : ['No Services'],
        revenue: serviceRevenueArr.length > 0 ? serviceRevenueArr : [0],
        colors: serviceColors,
      },
      totalRevenue: overallTotalRevenue,
      totalLoss: overallTotalLoss,
    };
  }, [bookings, pets, services]);

  const dateRange = timeFilter === 'custom' ? 'Custom Range' : `Current ${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}`;

  return (
    <div>
      {/* Charts Grid - 2x2 Layout */}
      <div className={styles.chartsSection}>
        {/* Chart 1: Overall Sales Performance */}
        <OverallSalesChart
          data={analyticsData.salesData.totalRevenue}
          labels={analyticsData.salesData.labels}
          dateRange={dateRange}
          totalRevenue={analyticsData.totalRevenue}
        />

        {/* Chart 2: Revenue Loss from Cancellations */}
        <RevenueLossChart
          potentialData={analyticsData.salesData.potentialRevenue}
          actualData={analyticsData.salesData.actualRevenue}
          labels={analyticsData.salesData.labels}
          dateRange={dateRange}
          totalLoss={analyticsData.totalLoss}
        />

        {/* Chart 3: New vs Returning Customer Revenue */}
        <NewVsReturningChart
          newCustomerData={analyticsData.salesData.newCustomerRevenue}
          returningCustomerData={analyticsData.salesData.returningCustomerRevenue}
          labels={analyticsData.salesData.labels}
          dateRange={dateRange}
        />

        {/* Chart 4: Sales Performance by Service */}
        <ServicePerformanceChart
          serviceNames={analyticsData.serviceData.names}
          serviceRevenue={analyticsData.serviceData.revenue}
          colors={analyticsData.serviceData.colors}
          dateRange={dateRange}
        />
      </div>
    </div>
  );
}