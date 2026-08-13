import React, { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../business-dashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface BusinessPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly';
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function BusinessPerformance({ timeFilter, petTypeFilter }: BusinessPerformanceProps) {
  // Mock data for charts
  const mockBookingsByDay = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [8, 12, 10, 15, 11, 9, 5],
  };

  const mockPetTypeDistribution = {
    labels: ['Dogs', 'Cats'],
    values: [65, 35],
  };

  const mockServiceBreakdown = [
    { name: 'Full Grooming', bookings: 25, percentage: 35 },
    { name: 'Bath & Trim', bookings: 18, percentage: 25 },
    { name: 'Nail Trimming', bookings: 12, percentage: 17 },
    { name: 'Cat Bath', bookings: 10, percentage: 14 },
    { name: 'Other Services', bookings: 5, percentage: 9 },
  ];

  // Chart configurations
  const bookingChartData = useMemo(() => ({
    labels: mockBookingsByDay.labels,
    datasets: [
      {
        label: 'Daily Bookings',
        data: mockBookingsByDay.values,
        backgroundColor: '#1e3a8a',
        borderRadius: 6,
      },
    ],
  }), []);

  const petTypeChartData = useMemo(() => ({
    labels: mockPetTypeDistribution.labels,
    datasets: [
      {
        data: mockPetTypeDistribution.values,
        backgroundColor: ['#1e3a8a', '#facc15'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 2,
      },
    ],
  }), []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5,
        },
      },
    },
  };

  return (
    <div>
      {/* Charts Grid */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Bookings by Day</h3>
          <div className={styles.chart}>
            <Bar data={bookingChartData} options={barChartOptions} />
          </div>
        </div>

        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Pet Type Distribution</h3>
          <div className={styles.chart}>
            <Doughnut data={petTypeChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Service Breakdown Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Service Performance Breakdown</h3>
        </div>
        <div className={styles.servicesList}>
          {mockServiceBreakdown.map((service, idx) => (
            <div key={idx} className={styles.serviceItem}>
              <div className={styles.serviceInfo}>
                <div className={styles.serviceName}>{service.name}</div>
                <div className={styles.serviceCount}>{service.bookings} bookings</div>
              </div>
              <div className={styles.serviceStats}>
                <div className={styles.serviceRevenue}>{service.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pet Type Performance Cards */}
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>Performance by Pet Type</h3>
        <div className={styles.petBreakdown}>
          <div className={styles.petItem}>
            <div className={styles.petType}>🐕</div>
            <div className={styles.petLabel}>Dogs</div>
            <div className={styles.petStat}>28 bookings</div>
            <div className={styles.petStat}>65% of total</div>
          </div>
          <div className={styles.petItem}>
            <div className={styles.petType}>🐱</div>
            <div className={styles.petLabel}>Cats</div>
            <div className={styles.petStat}>15 bookings</div>
            <div className={styles.petStat}>35% of total</div>
          </div>
        </div>
      </div>
    </div>
  );
}