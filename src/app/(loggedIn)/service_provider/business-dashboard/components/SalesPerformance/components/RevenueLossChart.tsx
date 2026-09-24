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

interface RevenueLossChartProps {
  potentialData: number[];
  actualData: number[];
  labels: string[];
  dateRange: string;
  totalLoss: number;
}

export default function RevenueLossChart({
  potentialData,
  actualData,
  labels,
  dateRange,
  totalLoss,
}: RevenueLossChartProps) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Potential Revenue',
        data: potentialData,
        borderColor: '#cbd5e1',
        borderDash: [5, 5],
        backgroundColor: 'rgba(203, 213, 225, 0.1)',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: '#cbd5e1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
      {
        label: 'Actual Revenue',
        data: actualData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }), [potentialData, actualData, labels]);

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
      <h3 className={styles.chartTitle}>Revenue Loss from Cancellations</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
        {dateRange}
      </p>
      <div className={styles.chart}>
        <Line data={chartData} options={chartOptions} />
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1rem' }}>
        Total Loss: <strong>{formatCurrency(totalLoss)}</strong>
      </p>
    </div>
  );
}