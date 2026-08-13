import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { formatCurrency } from '../utils';
import styles from '../business-dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly';
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function SalesPerformance({ timeFilter, petTypeFilter }: SalesPerformanceProps) {
  // Mock sales data
  const mockSalesData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    revenue: [5200, 6800, 5500, 10800],
    bookings: [8, 11, 9, 17],
  };

  const mockTopServices = [
    { name: 'Full Grooming', revenue: 9800, count: 25 },
    { name: 'Bath & Trim', revenue: 6300, count: 18 },
    { name: 'Nail Trimming', revenue: 3600, count: 12 },
    { name: 'Cat Bath', revenue: 2800, count: 10 },
  ];

  // Revenue trend chart data
  const revenueChartData = useMemo(() => ({
    labels: mockSalesData.labels,
    datasets: [
      {
        label: 'Revenue',
        data: mockSalesData.revenue,
        borderColor: '#1e3a8a',
        backgroundColor: 'rgba(30, 58, 138, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1e3a8a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }), []);

  // Booking trend chart data
  const bookingChartData = useMemo(() => ({
    labels: mockSalesData.labels,
    datasets: [
      {
        label: 'Bookings',
        data: mockSalesData.bookings,
        borderColor: '#facc15',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#facc15',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
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
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      {/* Sales Trend Charts */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Revenue Trend</h3>
          <div className={styles.chart}>
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Booking Trend</h3>
          <div className={styles.chart}>
            <Line data={bookingChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Top Services by Revenue */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Top Services by Revenue</h3>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service Name</th>
              <th style={{ textAlign: 'center' }}>Bookings</th>
              <th style={{ textAlign: 'right' }}>Total Revenue</th>
              <th style={{ textAlign: 'right' }}>Avg per Booking</th>
            </tr>
          </thead>
          <tbody>
            {mockTopServices.map((service, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{service.name}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>{service.count}</td>
                <td style={{ textAlign: 'right' }}>
                  <strong>{formatCurrency(service.revenue)}</strong>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(service.revenue / service.count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sales Summary Cards */}
      <div className={styles.chartsSection}>
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>Sales Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Total Revenue (Period)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                {formatCurrency(28500)}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Average Revenue per Day
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                {formatCurrency(7125)}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Total Transactions
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                45
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}