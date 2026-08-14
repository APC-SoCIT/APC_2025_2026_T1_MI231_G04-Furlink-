import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../../../business-dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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
        backgroundColor: '#06b6d4',
        borderRadius: 6,
      },
      {
        label: 'Returning Customers',
        data: returningCustomerData,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
    ],
  }), [newCustomerData, returningCustomerData, labels]);

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
      <h3 className={styles.chartTitle}>New vs Returning Customer Revenue</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
        {dateRange}
      </p>
      <div className={styles.chart}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}