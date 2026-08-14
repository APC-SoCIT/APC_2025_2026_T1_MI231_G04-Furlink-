import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../../../business-dashboard.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PetTypeDistributionProps {
  data: number[];
  labels: string[];
}

export default function PetTypeDistribution({ data, labels }: PetTypeDistributionProps) {
  // Chart configuration
  const petTypeChartData = useMemo(() => ({
    labels,
    datasets: [
      {
        data,
        backgroundColor: ['#1e3a8a', '#facc15'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 2,
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
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Pet Type Distribution</h3>
      <div className={styles.chart}>
        <Doughnut data={petTypeChartData} options={chartOptions} />
      </div>
    </div>
  );
}