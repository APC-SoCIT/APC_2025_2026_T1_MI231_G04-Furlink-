import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import styles from '../business-dashboard.module.css';

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
  const serviceChartData = useMemo(() => {
    const labels = services.map(s => s.name);
    const data = services.map(s => s.bookings);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
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
        display: false, 
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            
            const words = label.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            
            words.forEach((word: string) => {
              if ((currentLine + word).length > 20) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
              } else {
                currentLine += word + ' ';
              }
            });
            lines.push(currentLine.trim());
            lines[lines.length - 1] += `: ${value} bookings`;
            
            return lines;
          }
        }
      }
    },
    cutout: '70%', 
  };

  return (
    <div className={styles.sidebarSection}>
      <h3>Booked Services</h3>
      
      <div style={{ height: '140px', position: 'relative', margin: '0.5rem 0' }}>
        <Doughnut data={serviceChartData} options={chartOptions} />
      </div>
      
      {/* Service Percentages Legend */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        fontSize: '0.7rem',
        color: '#64748b',
        fontWeight: 600,
        maxHeight: '120px', 
        overflowY: 'auto', 
        paddingRight: '4px' 
      }}>
        {services.map((service, idx) => (
          <div key={service.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <div 
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][idx % 5],
                flexShrink: 0,
                marginTop: '3px'
              }}
            />
            <span style={{ 
              wordBreak: 'break-word', 
              whiteSpace: 'normal',
              lineHeight: '1.2' 
            }}>
              {service.percentage}% {service.name} ({service.bookings})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}