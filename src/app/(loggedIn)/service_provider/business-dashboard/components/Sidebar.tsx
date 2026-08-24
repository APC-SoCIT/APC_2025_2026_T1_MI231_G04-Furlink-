import React from 'react';
import Link from 'next/link'; // Import Link for Next.js navigation
import { FaArrowLeft } from 'react-icons/fa'; // Import the back arrow icon
import { DashboardTab } from '../type';
import ServiceBreakdown from './ServiceBreakdown';
import styles from '../business-dashboard.module.css';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'custom';
  setTimeFilter: (val: 'weekly' | 'monthly' | 'yearly' | 'custom') => void;
  petTypeFilter: 'all' | 'dog' | 'cat';
  setPetTypeFilter: (val: 'all' | 'dog' | 'cat') => void;
  customDateStart: string;
  setCustomDateStart: (val: string) => void;
  customDateEnd: string;
  setCustomDateEnd: (val: string) => void;
  bookedServices: { name: string; bookings: number; percentage: number }[];
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  timeFilter,
  setTimeFilter,
  petTypeFilter,
  setPetTypeFilter,
  customDateStart,
  setCustomDateStart,
  customDateEnd,
  setCustomDateEnd,
  bookedServices
}: SidebarProps) {
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <aside className={styles.sidebar}>
      
      {/* Back Button to SP Dashboard */}
      <div style={{ paddingBottom: '1.5rem' }}>
        <Link href="/service_provider/sp_dashboard" style={{ textDecoration: 'none' }}>
          <button style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 'bold', 
            color: '#1e3a8a',
            padding: 0
          }}>
            <FaArrowLeft size={16} /> Back to Dashboard
          </button>
        </Link>
      </div>

      <div className={styles.sidebarNav}>
        <button
          className={`${styles.sidebarTab} ${activeTab === 'business_performance' ? styles.sidebarTabActive : ''}`}
          onClick={() => setActiveTab('business_performance')}
        >
          Business Performance
        </button>
        <button
          className={`${styles.sidebarTab} ${activeTab === 'sales' ? styles.sidebarTabActive : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Sales Performance
        </button>
        <button
          className={`${styles.sidebarTab} ${activeTab === 'customer_insights' ? styles.sidebarTabActive : ''}`}
          onClick={() => setActiveTab('customer_insights')}
        >
          Customer Insights
        </button>
      </div>

      <div className={styles.sidebarSection}>
        <h3>Timeframe</h3>
        <select
          className={styles.sidebarDropdown}
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as 'weekly' | 'monthly' | 'yearly' | 'custom')}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom Range</option>
        </select>

        {timeFilter === 'custom' && (
          <div className={styles.customDateRange}>
            <label className={styles.dateLabel}>From:</label>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={customDateStart} 
              onChange={(e) => setCustomDateStart(e.target.value)} 
              max={customDateEnd || today} 
            />
            
            <label className={styles.dateLabel}>To:</label>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={customDateEnd} 
              onChange={(e) => setCustomDateEnd(e.target.value)} 
              min={customDateStart}
              max={today} 
            />
          </div>
        )}
      </div>

      <div className={styles.sidebarSection}>
        <h3>Pet Type</h3>
        <select
          className={styles.sidebarDropdown}
          value={petTypeFilter}
          onChange={(e) => setPetTypeFilter(e.target.value as 'all' | 'dog' | 'cat')}
        >
          <option value="all">Both (Dog & Cat)</option>
          <option value="dog">Dogs Only</option>
          <option value="cat">Cats Only</option>
        </select>
      </div>

      {/* Booked Services Doughnut Chart Widget - Conditionally rendered only on Business Performance */}
      {activeTab === 'business_performance' && (
        <ServiceBreakdown services={bookedServices} />
      )}
      
    </aside>
  );
}