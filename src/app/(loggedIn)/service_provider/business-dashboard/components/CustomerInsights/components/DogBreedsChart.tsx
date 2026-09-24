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

interface BreedChartProps {
  labels: string[];
  dogValues: number[];
  catValues: number[];
}

export default function DogBreedsChart({ labels, dogValues, catValues }: BreedChartProps) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: 'Dogs',
        data: dogValues,
        backgroundColor: '#1e3a8a', // Blue for dogs
        borderRadius: 6,
        barThickness: 18,
      },
      {
        label: 'Cats',
        data: catValues,
        backgroundColor: '#facc15', // Yellow for cats
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  }), [labels, dogValues, catValues]);

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'bottom' as const,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        stacked: true, // Stack them cleanly if a label shares space
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
        stacked: true,
        grid: { display: false },
        ticks: {
          font: { size: 11 },
        },
        title: {
          display: true,
          text: 'Breed',
          font: { size: 11 },
          color: '#64748b',
        },
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Most Booked Breeds</h3>
      <div className={styles.chart}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}