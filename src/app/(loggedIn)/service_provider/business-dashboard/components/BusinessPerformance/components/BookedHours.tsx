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

interface BookedHoursProps {
  timeLabels: string[];
  dogData: number[];
  catData: number[];
  petTypeFilter: 'all' | 'dog' | 'cat';
  busiestHour?: string;
}

export default function BookedHours({ 
  timeLabels, 
  dogData, 
  catData, 
  petTypeFilter,
  busiestHour = '9:00 AM'
}: BookedHoursProps) {
  // Prepare chart data based on pet filter
  const bookedHoursChartData = useMemo(() => {
    if (petTypeFilter === 'all') {
      return {
        labels: timeLabels,
        datasets: [
          {
            label: 'Dog',
            data: dogData,
            backgroundColor: '#1e3a8a',
            borderRadius: 6,
            barThickness: 30,
          },
          {
            label: 'Cat',
            data: catData,
            backgroundColor: '#facc15',
            borderRadius: 6,
            barThickness: 30,
          },
        ],
      };
    } else if (petTypeFilter === 'dog') {
      return {
        labels: timeLabels,
        datasets: [
          {
            label: 'Dog',
            data: dogData,
            backgroundColor: '#1e3a8a',
            borderRadius: 6,
            barThickness: 30,
          },
        ],
      };
    } else {
      return {
        labels: timeLabels,
        datasets: [
          {
            label: 'Cat',
            data: catData,
            backgroundColor: '#facc15',
            borderRadius: 6,
            barThickness: 30,
          },
        ],
      };
    }
  }, [timeLabels, dogData, catData, petTypeFilter]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: petTypeFilter === 'all',
        position: 'top' as const,
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
      <h3 className={styles.chartTitle}>Booked Hours</h3>
      <div className={styles.chart}>
        <Bar data={bookedHoursChartData} options={chartOptions} />
      </div>
      
      {/* Insight text */}
      <p style={{
        textAlign: 'center',
        fontSize: '0.875rem',
        color: '#64748b',
        marginTop: '0.75rem',
        fontStyle: 'italic',
        margin: '0.75rem 0 0 0'
      }}>
        {busiestHour} is usually busy
      </p>
    </div>
  );
}