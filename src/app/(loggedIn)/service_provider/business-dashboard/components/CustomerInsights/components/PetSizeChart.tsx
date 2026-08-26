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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface PetSizeChartProps {
  labels: string[];
  values: number[];
}

export default function PetSizeChart({ labels, values }: PetSizeChartProps) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Bookings',
        data: values,
        backgroundColor: '#1e3a8a',
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  }), [labels, values]);

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 11 },
        },
        title: {
          display: true,
          text: 'Number of Bookings',
          font: { size: 11 },
          color: '#64748b',
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
        },
        title: {
          display: true,
          text: 'Pet Size',
          font: { size: 11 },
          color: '#64748b',
        },
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Most Booked Pet Size</h3>
      <div className={styles.chart}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}