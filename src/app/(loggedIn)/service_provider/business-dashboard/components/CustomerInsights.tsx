import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController,
  RadialLinearScale
} from 'chart.js';
import { formatCurrency, formatDate } from '../utils';
import styles from '../business-dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  RadarController
);

interface CustomerInsightsProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly';
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function CustomerInsights({ timeFilter, petTypeFilter }: CustomerInsightsProps) {
  // Mock customer data
  const mockTopCustomers = [
    {
      id: '1',
      name: 'Maria Santos',
      totalSpent: 8500.00,
      bookingCount: 12,
      rating: 5,
      lastBooking: '2026-08-10',
      petNames: 'Max, Luna',
    },
    {
      id: '2',
      name: 'John Reyes',
      totalSpent: 6200.00,
      bookingCount: 9,
      rating: 4.8,
      lastBooking: '2026-08-08',
      petNames: 'Buddy',
    },
    {
      id: '3',
      name: 'Anna Garcia',
      totalSpent: 5800.00,
      bookingCount: 8,
      rating: 4.7,
      lastBooking: '2026-08-05',
      petNames: 'Whiskers, Mittens',
    },
    {
      id: '4',
      name: 'Robert Cruz',
      totalSpent: 4500.00,
      bookingCount: 6,
      rating: 4.5,
      lastBooking: '2026-08-02',
      petNames: 'Rocky',
    },
    {
      id: '5',
      name: 'Lisa Fernandez',
      totalSpent: 3200.00,
      bookingCount: 5,
      rating: 4.6,
      lastBooking: '2026-07-30',
      petNames: 'Charlie',
    },
  ];

  const mockServiceSatisfaction = {
    labels: ['Full Grooming', 'Bath & Trim', 'Nail Trimming', 'Cat Bath', 'Other Services'],
    ratings: [4.8, 4.6, 4.7, 4.5, 4.4],
  };

  const mockCustomerSegmentation = [
    { segment: 'Premium (10+ bookings)', count: 8, revenue: 12500 },
    { segment: 'Regular (5-9 bookings)', count: 15, revenue: 15800 },
    { segment: 'Occasional (1-4 bookings)', count: 22, revenue: 8200 },
  ];

  // Service satisfaction radar chart data
  const satisfactionChartData = useMemo(() => ({
    labels: mockServiceSatisfaction.labels,
    datasets: [
      {
        label: 'Customer Satisfaction',
        data: mockServiceSatisfaction.ratings,
        borderColor: '#1e3a8a',
        backgroundColor: 'rgba(30, 58, 138, 0.1)',
        pointBackgroundColor: '#1e3a8a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4,
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
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div>
      {/* Customer Satisfaction Chart */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Service Satisfaction Ratings</h3>
          <div className={styles.chart}>
            <Radar data={satisfactionChartData} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Customer Segmentation</h3>
          <div className={styles.servicesList}>
            {mockCustomerSegmentation.map((segment, idx) => (
              <div key={idx} className={styles.serviceItem}>
                <div className={styles.serviceInfo}>
                  <div className={styles.serviceName}>{segment.segment}</div>
                  <div className={styles.serviceCount}>{segment.count} customers</div>
                </div>
                <div className={styles.serviceStats}>
                  <div className={styles.serviceRevenue}>{formatCurrency(segment.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Top Customers</h3>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Pet(s)</th>
              <th style={{ textAlign: 'center' }}>Bookings</th>
              <th style={{ textAlign: 'right' }}>Total Spent</th>
              <th style={{ textAlign: 'center' }}>Rating</th>
              <th>Last Booking</th>
            </tr>
          </thead>
          <tbody>
            {mockTopCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <strong>{customer.name}</strong>
                </td>
                <td>{customer.petNames}</td>
                <td style={{ textAlign: 'center' }}>{customer.bookingCount}</td>
                <td style={{ textAlign: 'right' }}>
                  <strong>{formatCurrency(customer.totalSpent)}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ color: '#facc15', fontWeight: 'bold' }}>
                    ★ {customer.rating}/5
                  </span>
                </td>
                <td>{formatDate(customer.lastBooking)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Insights Summary */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Customer Insights Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Total Unique Customers
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                45
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Average Customer Rating
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                ★ 4.6/5.0
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Repeat Customer Rate
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                72%
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Avg Lifetime Value
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                {formatCurrency(633.33)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}