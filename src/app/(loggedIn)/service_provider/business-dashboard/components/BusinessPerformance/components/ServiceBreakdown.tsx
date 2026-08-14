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

interface Service {
  name: string;
  bookings: number;
  percentage: number;
}

interface ServiceBreakdownProps {
  services: Service[];
}

export default function ServiceBreakdown({ services }: ServiceBreakdownProps) {
  // Prepare chart data
  const serviceChartData = useMemo(() => {
    const labels = services.map(s => s.name);
    const data = services.map(s => s.bookings);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#1e3a8a',  // Dark blue
            '#3b82f6',  // Medium blue
            '#60a5fa',  // Light blue
            '#93c5fd',  // Lighter blue
            '#bfdbfe',  // Very light blue
          ],
          borderColor: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
          borderWidth: 2,
        },
      ],
    };
  }, [services]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend to show custom percentages below
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed}`;
          }
        }
      }
    },
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Booked Services</h3>
      <div className={styles.chart}>
        <Doughnut data={serviceChartData} options={chartOptions} />
      </div>
      
      {/* Service Percentages Legend */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem',
        marginTop: '1rem',
        fontSize: '0.875rem',
        color: '#64748b'
      }}>
        {services.slice(0, 3).map((service, idx) => (
          <div key={service.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: ['#1e3a8a', '#3b82f6', '#60a5fa'][idx],
              }}
            />
            <span>{service.percentage}% {service.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}