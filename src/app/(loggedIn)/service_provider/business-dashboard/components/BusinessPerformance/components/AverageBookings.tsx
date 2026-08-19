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

interface AverageBookingsProps {
  dogData: number[];
  catData: number[];
  labels: string[];
  petTypeFilter: 'all' | 'dog' | 'cat';
  title?: string;
}

export default function AverageBookings({ dogData, catData, labels, petTypeFilter }: AverageBookingsProps) {
  // Prepare chart data based on pet filter
  const bookingChartData = useMemo(() => {
    if (petTypeFilter === 'all') {
      return {
        labels,
        datasets: [
          {
            label: 'Dogs',
            data: dogData,
            backgroundColor: '#1e3a8a',
            borderRadius: 6,
            barThickness: 35,
          },
          {
            label: 'Cats',
            data: catData,
            backgroundColor: '#facc15',
            borderRadius: 6,
            barThickness: 35,
          },
        ],
      };
    } else if (petTypeFilter === 'dog') {
      return {
        labels,
        datasets: [
          {
            label: 'Dogs',
            data: dogData,
            backgroundColor: '#1e3a8a',
            borderRadius: 6,
            barThickness: 35,
          },
        ],
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'Cats',
            data: catData,
            backgroundColor: '#facc15',
            borderRadius: 6,
            barThickness: 35,
          },
        ],
      };
    }
  }, [dogData, catData, labels, petTypeFilter]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: petTypeFilter === 'all',
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 12 },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5,
          font: { size: 11 },
        },
        grid: {
          display: true,
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Average Bookings</h3>
      <div className={styles.chart}>
        <Bar data={bookingChartData} options={chartOptions} />
      </div>
    </div>
  );
}