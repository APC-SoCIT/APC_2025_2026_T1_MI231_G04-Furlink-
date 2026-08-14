import React, { useMemo } from 'react';
import BookingsByDay from './components/BookingsByDay';
import PetTypeDistribution from './components/PetTypeDistribution';
import ServiceBreakdown from './components/ServiceBreakdown';
import BookedHours from './components/BookedHours';
import styles from '../../business-dashboard.module.css';

interface BusinessPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly';
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function BusinessPerformance({ timeFilter, petTypeFilter }: BusinessPerformanceProps) {
  // Mock data for bookings by day/week
  const mockBookingsByDay = useMemo(() => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    dogValues: [5, 8, 6, 10, 7, 4, 2],
    catValues: [3, 4, 4, 6, 5, 3, 1],
  }), []);

  // Mock data for pet type distribution (doughnut)
  const mockPetTypeDistribution = useMemo(() => ({
    labels: ['Dogs', 'Cats'],
    values: [65, 35],
  }), []);

  // Mock data for service breakdown
  const mockServiceBreakdown = useMemo(() => [
    { name: 'Full Grooming', bookings: 25, percentage: 25 },
    { name: 'Pooch', bookings: 50, percentage: 50 },
    { name: 'Nail Clipping', bookings: 25, percentage: 25 },
  ], []);

  // Mock data for booked hours
  const mockBookedHours = useMemo(() => ({
    timeLabels: ['9:00 AM', '10:30 AM', '12:00 PM', '1:30 PM', '3:00 PM', '4:30 PM'],
    dogValues: [1, 0, 0, 0, 0, 1],
    catValues: [0, 0, 0, 0, 0, 0],
  }), []);

  return (
    <div>
      {/* Charts Grid - Bookings by Day and Pet Type Distribution */}
      <div className={styles.chartsSection}>
        <BookingsByDay 
          dogData={mockBookingsByDay.dogValues} 
          catData={mockBookingsByDay.catValues}
          labels={mockBookingsByDay.labels}
          petTypeFilter={petTypeFilter}
        />

        <PetTypeDistribution 
          data={mockPetTypeDistribution.values} 
          labels={mockPetTypeDistribution.labels}
        />
      </div>

      {/* Service Breakdown and Booked Hours Grid */}
      <div className={styles.chartsSection}>
        <ServiceBreakdown services={mockServiceBreakdown} />

        <BookedHours 
          timeLabels={mockBookedHours.timeLabels}
          dogData={mockBookedHours.dogValues}
          catData={mockBookedHours.catValues}
          petTypeFilter={petTypeFilter}
          busiestHour="9:00 AM"
        />
      </div>

      {/* Pet Type Performance Cards */}
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>Performance by Pet Type</h3>
        <div className={styles.petBreakdown}>
          <div className={styles.petItem}>
            <div className={styles.petType}>🐕</div>
            <div className={styles.petLabel}>Dogs</div>
            <div className={styles.petStat}>
              {mockBookingsByDay.dogValues.reduce((a, b) => a + b, 0)} bookings
            </div>
            <div className={styles.petStat}>
              {((mockBookingsByDay.dogValues.reduce((a, b) => a + b, 0) / 
                (mockBookingsByDay.dogValues.reduce((a, b) => a + b, 0) + 
                 mockBookingsByDay.catValues.reduce((a, b) => a + b, 0))) * 100).toFixed(0)}% of total
            </div>
          </div>
          <div className={styles.petItem}>
            <div className={styles.petType}>🐱</div>
            <div className={styles.petLabel}>Cats</div>
            <div className={styles.petStat}>
              {mockBookingsByDay.catValues.reduce((a, b) => a + b, 0)} bookings
            </div>
            <div className={styles.petStat}>
              {((mockBookingsByDay.catValues.reduce((a, b) => a + b, 0) / 
                (mockBookingsByDay.dogValues.reduce((a, b) => a + b, 0) + 
                 mockBookingsByDay.catValues.reduce((a, b) => a + b, 0))) * 100).toFixed(0)}% of total
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}