import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../../../business-dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

interface NewVsReturningChartProps {
  newCustomerData: number[];
  returningCustomerData: number[];
  labels: string[];
  dateRange: string;
}

export default function NewVsReturningChart({
  newCustomerData,
  returningCustomerData,
  labels,
  dateRange,
}: NewVsReturningChartProps) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'New Customers',
        data: newCustomerData,
        borderColor: '#06b6d4',
        backgroundColor: '#06b6d4',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Returning Customers',
        data: returningCustomerData,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  }), [newCustomerData, returningCustomerData, labels]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '₱' + value.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 className={styles.chartTitle} style={{ margin: 0 }}>New vs Returning Customer Revenue</h3>
        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
          {dateRange}
        </span>
      </div>
      <div className={styles.chart}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}