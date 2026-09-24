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

interface CustomerTypeChartProps {
  labels: string[];
  values: number[];
  colors: string[];
}

export default function CustomerTypeChart({ labels, values, colors }: CustomerTypeChartProps) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  }), [labels, values, colors]);

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
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(0);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '70%',
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>New vs Old Customers</h3>
      <div className={styles.chart}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}