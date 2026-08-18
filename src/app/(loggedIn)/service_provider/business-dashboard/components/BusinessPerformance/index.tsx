import React, { useMemo } from 'react';
import BookingsByDay from './components/BookingsByDay';
import PetTypeDistribution from './components/PetTypeDistribution';
import ServiceBreakdown from './components/ServiceBreakdown';
import BookedHours from './components/BookedHours';
import { processBusinessPerformanceData } from '@/utils/analyticsCalculations';
import styles from '../../business-dashboard.module.css';

interface BusinessPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly'| 'custom';
  petTypeFilter: 'all' | 'dog' | 'cat';
  bookings: any[];
  pets: any[];
  services: any[];
}

export default function BusinessPerformance({ 
  timeFilter, 
  petTypeFilter, 
  bookings, 
  pets, 
  services 
}: BusinessPerformanceProps) {
  
  // Transform raw Supabase data into aggregated metrics for charts
  const analytics = useMemo(() => {
    return processBusinessPerformanceData(bookings, pets, services);
  }, [bookings, pets, services]);

  // Extract totals for performance cards
  const totalDogs = analytics.petTypeDistribution.values[0];
  const totalCats = analytics.petTypeDistribution.values[1];
  const totalPetsCount = totalDogs + totalCats;

  const dogPercentage = totalPetsCount > 0 ? ((totalDogs / totalPetsCount) * 100).toFixed(0) : '0';
  const catPercentage = totalPetsCount > 0 ? ((totalCats / totalPetsCount) * 100).toFixed(0) : '0';

  return (
    <div>
      {/* Charts Grid - Bookings by Day and Pet Type Distribution */}
      <div className={styles.chartsSection}>
        <BookingsByDay 
          dogData={analytics.bookingsByDay.dogValues} 
          catData={analytics.bookingsByDay.catValues}
          labels={analytics.bookingsByDay.labels}
          petTypeFilter={petTypeFilter}
        />

        <PetTypeDistribution 
          data={analytics.petTypeDistribution.values} 
          labels={analytics.petTypeDistribution.labels}
        />
      </div>

      {/* Service Breakdown and Booked Hours Grid */}
      <div className={styles.chartsSection}>
        <ServiceBreakdown services={analytics.serviceBreakdown} />

        <BookedHours 
          timeLabels={analytics.bookedHours.timeLabels}
          dogData={analytics.bookedHours.dogValues}
          catData={analytics.bookedHours.catValues}
          petTypeFilter={petTypeFilter}
          busiestHour={analytics.bookedHours.busiestHour}
        />
      </div>

      {/* Pet Type Performance Cards */}
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>Performance by Pet Type</h3>
        <div className={styles.petBreakdown}>
          <div className={styles.petItem}>
            <div className={styles.petType}>🐕</div>
            <div className={styles.petLabel}>Dogs</div>
            <div className={styles.petStat}>{totalDogs} bookings</div>
            <div className={styles.petStat}>{dogPercentage}% of total</div>
          </div>
          <div className={styles.petItem}>
            <div className={styles.petType}>🐱</div>
            <div className={styles.petLabel}>Cats</div>
            <div className={styles.petStat}>{totalCats} bookings</div>
            <div className={styles.petStat}>{catPercentage}% of total</div>
          </div>
        </div>
      </div>
    </div>
  );
}