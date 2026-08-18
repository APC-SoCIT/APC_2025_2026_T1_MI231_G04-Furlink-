import React from 'react';
import { DashboardTab } from '../type';
import styles from '../business-dashboard.module.css';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  timeFilter: 'weekly' | 'monthly' | 'yearly' | 'custom';
  setTimeFilter: (val: 'weekly' | 'monthly' | 'yearly' | 'custom') => void;
  petTypeFilter: 'all' | 'dog' | 'cat';
  setPetTypeFilter: (val: 'all' | 'dog' | 'cat') => void;
  // New props for Custom Date Range
  customDateStart: string;
  setCustomDateStart: (val: string) => void;
  customDateEnd: string;
  setCustomDateEnd: (val: string) => void;
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
  setCustomDateEnd
}: SidebarProps) {
  
  // Helper to restrict future dates in the picker
  const today = new Date().toISOString().split('T')[0];

  return (
    <aside className={styles.sidebar}>
      
      {/* Navigation Tabs */}
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

      {/* Timeframe Filter */}
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

        {/* Custom Date Range Inputs - Renders only when 'custom' is selected */}
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

      {/* Pet Type Filter */}
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
      
    </aside>
  );
}