import React from 'react';
import { formatCurrency } from '../../utils';
import OverallSalesChart from './components/OverallSalesChart';
import RevenueLossChart from './components/RevenueLossChart';
import NewVsReturningChart from './components/NewVsReturningChart';
import ServicePerformanceChart from './components/ServicePerformanceChart';
import styles from '../../business-dashboard.module.css';

interface SalesPerformanceProps {
  timeFilter: 'weekly' | 'monthly' | 'yearly';
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function SalesPerformance({ timeFilter, petTypeFilter }: SalesPerformanceProps) {
  // Mock data for charts
  const mockSalesData = {
    labels: ['Aug 1-7', 'Aug 8-14', 'Aug 15-21', 'Aug 22-31'],
    totalRevenue: [5200, 6800, 5500, 10800],
    potentialRevenue: [5500, 7200, 6000, 11500],
    actualRevenue: [5200, 6800, 5500, 10800],
    newCustomerRevenue: [1500, 2000, 1800, 3200],
    returningCustomerRevenue: [3700, 4800, 3700, 7600],
  };

  const mockServiceData = {
    names: ['Pooch', 'Nail Dipping', 'Kitty Bath', 'Ear Cleaning', 'Tooth Brushing', 'Paw Trim'],
    revenue: [9800, 6300, 2800, 3600, 2400, 1800],
    colors: ['#1e3a8a', '#facc15', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'],
  };

  const topServices = [
    { name: 'Pooch', revenue: 9800, bookings: 25 },
    { name: 'Nail Dipping', revenue: 6300, bookings: 18 },
    { name: 'Kitty Bath', revenue: 2800, bookings: 10 },
    { name: 'Ear Cleaning', revenue: 3600, bookings: 12 },
  ];

  const dateRange = 'Aug 01, 2026 - Aug 14, 2026';
  const totalRevenue = 28500;
  const totalLoss = 2000;

  return (
    <div>
      {/* Charts Grid - 2x2 Layout */}
      <div className={styles.chartsSection}>
        {/* Chart 1: Overall Sales Performance */}
        <OverallSalesChart
          data={mockSalesData.totalRevenue}
          labels={mockSalesData.labels}
          dateRange={dateRange}
          totalRevenue={totalRevenue}
        />

        {/* Chart 2: Revenue Loss from Cancellations */}
        <RevenueLossChart
          potentialData={mockSalesData.potentialRevenue}
          actualData={mockSalesData.actualRevenue}
          labels={mockSalesData.labels}
          dateRange={dateRange}
          totalLoss={totalLoss}
        />

        {/* Chart 3: New vs Returning Customer Revenue */}
        <NewVsReturningChart
          newCustomerData={mockSalesData.newCustomerRevenue}
          returningCustomerData={mockSalesData.returningCustomerRevenue}
          labels={mockSalesData.labels}
          dateRange={dateRange}
        />

        {/* Chart 4: Sales Performance by Service */}
        <ServicePerformanceChart
          serviceNames={mockServiceData.names}
          serviceRevenue={mockServiceData.revenue}
          colors={mockServiceData.colors}
          dateRange={dateRange}
        />
      </div>

      {/* Top Services by Revenue Table */}
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
            {topServices.map((service, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{service.name}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>{service.bookings}</td>
                <td style={{ textAlign: 'right' }}>
                  <strong>{formatCurrency(service.revenue)}</strong>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatCurrency(service.revenue / service.bookings)}
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
                {formatCurrency(totalRevenue)}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Average Revenue per Day
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                {formatCurrency(2037.14)}
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