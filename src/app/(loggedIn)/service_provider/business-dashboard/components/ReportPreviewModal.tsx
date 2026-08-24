import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FaTimes, FaDownload } from 'react-icons/fa';
import styles from '../business-dashboard.module.css';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfDocument: React.ReactElement<any>;
  fileName: string;
  reportPeriod: string;
  petTypeFilter: string;
  metrics: {
    revenue: number;
    bookings: number;
    cancellations: number;
    visitors: number;
    avgCustomer: number;
  };
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  title,
  pdfDocument,
  fileName,
  reportPeriod,
  petTypeFilter,
  metrics,
}: ReportPreviewModalProps) {
  if (!isOpen) return null;

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes size={18} />
          </button>
        </div>

        {/* Modal Body / Preview Area */}
        <div className={styles.modalBody}>
          <div className={styles.previewMetaBox}>
            <div className={styles.metaRow}>
              <span>Report Period:</span>
              <strong>{reportPeriod}</strong>
            </div>
            <div className={styles.metaRow}>
              <span>Report Type:</span>
              <strong>{title}</strong>
            </div>
            <div className={styles.metaRow}>
              <span>Pet Type Filter:</span>
              <strong>{petTypeFilter}</strong>
            </div>
            <div className={styles.metaRow}>
              <span>Generated:</span>
              <strong>{currentDate}</strong>
            </div>
          </div>

          {/* SHARED EXECUTIVE SUMMARY */}
          <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
            Executive Summary
          </h3>
          <div className={styles.previewGrid}>
            <div className={styles.previewCard}>
              <span className={styles.cardHeaderTitle}>GROSS REVENUE</span>
              <span className={styles.cardValue}>PHP {metrics.revenue.toLocaleString()}</span>
            </div>
            <div className={styles.previewCard}>
              <span className={styles.cardHeaderTitle}>TOTAL BOOKINGS</span>
              <span className={styles.cardValue}>{metrics.bookings}</span>
            </div>
            <div className={styles.previewCard}>
              <span className={styles.cardHeaderTitle}>LISTING VISITORS</span>
              <span className={styles.cardValue}>{metrics.visitors}</span>
            </div>
            <div className={styles.previewCard}>
              <span className={styles.cardHeaderTitle}>AVG BOOKINGS/CUSTOMER</span>
              <span className={styles.cardValue}>{metrics.avgCustomer}</span>
            </div>
            <div className={styles.previewCard}>
              <span className={styles.cardHeaderTitle}>CANCELLATIONS</span>
              <span className={styles.cardValue}>{metrics.cancellations}</span>
            </div>
          </div>

          {/* CUSTOMER INSIGHTS PREVIEW */}
          {title === 'Customer Insight Report' && (
            <>
              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Customer Demographics
              </h3>
              <div className={styles.previewAnalysisBox}>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Pet Type Preference:</span>
                  <span className={styles.analysisText}>Dog and cat bookings are evenly balanced.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Customer Loyalty:</span>
                  <span className={styles.analysisText}>New customers make up 0% of your customer base. Focus on retention strategies to convert them into loyal customers.</span>
                </div>
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Customer Reviews
              </h3>
              <div className={styles.previewAnalysisBox}>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Overall Rating:</span>
                  <span className={styles.analysisText}>0.0 / 5.0 (0 reviews)</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Staff Rating:</span>
                  <span className={styles.analysisText}>0.0 / 5.0</span>
                </div>
              </div>
            </>
          )}

          {/* BUSINESS REPORT PREVIEW */}
          {title === 'Business Report' && (
            <>
              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Performance Analysis
              </h3>
              <div className={styles.previewAnalysisBox}>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Peak Activity:</span>
                  <span className={styles.analysisText}>Your busiest time slot is typically No data. Consider optimizing staffing during this period.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Revenue Trend:</span>
                  <span className={styles.analysisText}>Revenue has remained stable compared to the previous period.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Booking Trend:</span>
                  <span className={styles.analysisText}>Booking volume has remained consistent with the previous period.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Top Performing Pet Type:</span>
                  <span className={styles.analysisText}>Cat services generated 0% of total revenue.</span>
                </div>
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Booking Volume by Pet Type
              </h3>
              <div className={styles.previewAnalysisBox}>
                <span className={styles.analysisText}>• Dogs: 0 bookings</span>
                <span className={styles.analysisText}>• Cats: 0 bookings</span>
              </div>
            </>
          )}

          {/* SALES REPORT PREVIEW */}
          {title === 'Sales Report' && (
            <>
              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Sales Analysis
              </h3>
              <div className={styles.previewAnalysisBox}>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Revenue Trend:</span>
                  <span className={styles.analysisText}>Revenue has remained stable compared to the previous period.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Booking Trend:</span>
                  <span className={styles.analysisText}>Booking volume has remained consistent with the previous period.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Cancellation Impact:</span>
                  <span className={styles.analysisText}>Cancellations resulted in a revenue loss of PHP 0.00 during this period. Excellent! No revenue was lost to cancellations.</span>
                </div>
                <div className={styles.analysisRow}>
                  <span className={styles.analysisHeading}>Top Performing Pet Type:</span>
                  <span className={styles.analysisText}>Cat services generated 0% of total revenue.</span>
                </div>
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Customer Segmentation
              </h3>
              <div className={styles.previewGrid}>
                <div className={styles.previewCard}>
                  <span className={styles.cardHeaderTitle}>NEW CUSTOMERS</span>
                  <span className={styles.cardValue}>PHP 0.00 <span style={{fontSize: '0.75rem', fontWeight: 'normal'}}>revenue</span></span>
                </div>
                <div className={styles.previewCard}>
                  <span className={styles.cardHeaderTitle}>RETURNING CUSTOMERS</span>
                  <span className={styles.cardValue}>PHP 0.00 <span style={{fontSize: '0.75rem', fontWeight: 'normal'}}>revenue</span></span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer with Download Button */}
        <div className={styles.modalFooter}>
          <PDFDownloadLink document={pdfDocument} fileName={fileName}>
            {({ loading }) => (
              <button className={styles.downloadPdfBtn} disabled={loading}>
                <FaDownload size={14} />
                {loading ? 'Preparing PDF...' : 'Download as PDF'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
    </div>
  );
}