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

interface PeakDaysProps {
  dogData: number[];
  catData: number[];
  petTypeFilter: 'all' | 'dog' | 'cat';
}

export default function PeakDays({ dogData, catData, petTypeFilter }: PeakDaysProps) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Prepare chart data based on pet filter
  const peakDaysChartData = useMemo(() => {
    if (petTypeFilter === 'all') {
      return {
        labels,
        datasets: [
          {
            label: 'Dogs',
            data: dogData,
            backgroundColor: '#1e3a8a',
            borderRadius: 6,
            barThickness: 30,
          },
          {
            label: 'Cats',
            data: catData,
            backgroundColor: '#facc15',
            borderRadius: 6,
            barThickness: 30,
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
            barThickness: 30,
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
            barThickness: 30,
          },
        ],
      };
    }
  }, [dogData, catData, petTypeFilter]);

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
          stepSize: 1,
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
      <h3 className={styles.chartTitle}>Peak Days</h3>
      <div className={styles.chart}>
        <Bar data={peakDaysChartData} options={chartOptions} />
      </div>
    </div>
  );
}