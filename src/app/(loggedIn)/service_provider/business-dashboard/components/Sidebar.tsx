import React, { useState } from 'react';
import Link from 'next/link';
import { FaBars, FaTimes, FaChartLine, FaArrowLeft } from 'react-icons/fa';
import { DashboardTab } from '../type';
import styles from '../business-dashboard.module.css';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const tabs = [
    { id: 'business_performance', label: 'Business Performance', icon: '📊' },
    { id: 'sales', label: 'Sales', icon: '📈' },
    { id: 'customer_insights', label: 'Customer Insights', icon: '👥' },
  ];

  const handleTabClick = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    setIsMobileOpen(false); // Close mobile sidebar on selection
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Dashboard</h2>
          <button
            className={styles.collapseButton}
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className={styles.sidebarNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as DashboardTab)}
              className={`${styles.sidebarTab} ${activeTab === tab.id ? styles.sidebarTabActive : ''}`}
              title={isOpen ? '' : tab.label}
            >
              <span className={styles.sidebarTabIcon}>{tab.icon}</span>
              {isOpen && <span className={styles.sidebarTabLabel}>{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Back to Dashboard Button */}
        <div className={styles.sidebarFooter}>
          <Link href="/service_provider/sp_dashboard" className={styles.backLink}>
            <button className={styles.backButtonSidebar} title="Back to Dashboard">
              <FaArrowLeft size={16} />
              {isOpen && <span>Back</span>}
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
