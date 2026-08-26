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
        borderColor: '#1e3a8a',
        backgroundColor: 'rgba(30, 58, 138, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: colors, // Keeps your distinct service colors on the data points!
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }), [serviceNames, serviceRevenue, colors]);

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
        <h3 className={styles.chartTitle} style={{ margin: 0 }}>Sales Performance by Service</h3>
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