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

interface ServicePerformanceChartProps {
  serviceNames: string[];
  serviceRevenue: number[];
  colors: string[];
  dateRange: string;
}

export default function ServicePerformanceChart({
  serviceNames,
  serviceRevenue,
  colors,
  dateRange,
}: ServicePerformanceChartProps) {
  const chartData = useMemo(() => ({
    labels: serviceNames,
    datasets: [
      {
        label: 'Service Revenue',
        data: serviceRevenue,
        backgroundColor: colors,
        borderRadius: 6,
      },
    ],
  }), [serviceNames, serviceRevenue, colors]);

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
      <h3 className={styles.chartTitle}>Sales Performance by Service</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
        {dateRange}
      </p>
      <div className={styles.chart}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}