import React, { useMemo } from 'react';
import AverageBookings from './components/AverageBookings';
import PeakDays from './components/PeakDays';
import BookedHours from './components/BookedHours';
import { processBusinessPerformanceData } from '@/utils/analyticsCalculations';
import styles from '../../business-dashboard.module.css';

interface BusinessPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'custom';
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

  // Dynamically set the title for Average Bookings based on the selected filter
  const averageBookingsTitle = `Average Bookings (${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)})`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* Top Chart - Average Bookings (Spans Full Width) */}
      <AverageBookings 
        dogData={analytics?.bookingsByDay?.dogValues || []} 
        catData={analytics?.bookingsByDay?.catValues || []}
        labels={analytics?.bookingsByDay?.labels || []}
        petTypeFilter={petTypeFilter}
        title={averageBookingsTitle}
      />

      {/* Bottom Charts Grid - Peak Days and Booked Hours (Side by Side) */}
      <div className={styles.chartsSection}>
        
        {/* Peak Days now uses live calculated data instead of mocks! */}
        <PeakDays
          dogData={analytics?.peakDays?.dogValues || []}
          catData={analytics?.peakDays?.catValues || []}
          petTypeFilter={petTypeFilter}
        />

        <BookedHours 
          timeLabels={analytics?.bookedHours?.timeLabels || []}
          dogData={analytics?.bookedHours?.dogValues || []}
          catData={analytics?.bookedHours?.catValues || []}
          petTypeFilter={petTypeFilter}
          busiestHour={analytics?.bookedHours?.busiestHour || '10:00 AM'}
        />
      </div>

    </div>
  );
}