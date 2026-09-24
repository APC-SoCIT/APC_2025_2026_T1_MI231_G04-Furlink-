import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { formatCurrency } from '../../../utils';
import styles from '../../../business-dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface OverallSalesChartProps {
  data: number[];
  labels: string[];
  dateRange: string;
  totalRevenue: number;
}

export default function OverallSalesChart({
  data,
  labels,
  dateRange,
  totalRevenue,
}: OverallSalesChartProps) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Total Revenue',
        data,
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
  }), [data, labels]);

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
      <h3 className={styles.chartTitle}>Overall Sales Performance</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
        {dateRange}
      </p>
      <div className={styles.chart}>
        <Line data={chartData} options={chartOptions} />
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1rem' }}>
        Total Revenue: <strong>{formatCurrency(totalRevenue)}</strong>
      </p>
    </div>
  );
}