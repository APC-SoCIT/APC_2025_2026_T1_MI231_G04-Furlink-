import React, { useMemo } from 'react';
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
  bookingsData?: any[];
  petsData?: any[];
  servicesData?: any[];
  peakActivity?: string;
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
  bookingsData = [],
  petsData = [],
  servicesData = [],
  peakActivity = '12:00 PM'
}: ReportPreviewModalProps) {
  
  // Compute dynamic metrics for previews (Business, Sales, and Customer Insights)
  const { 
    dogCount, catCount, topPetText, topServices, 
    petPrefText, newCustPer, topCustomersList 
  } = useMemo(() => {
    const validBookingIds = new Set(bookingsData.map((b: any) => b.id));
    const validPets = petsData.filter((p: any) => validBookingIds.has(p.booking_info_id));
    
    let dCount = 0; let cCount = 0;
    validPets.forEach((p: any) => {
      const type = String(p.booking_pet_type || p.pet_type || p.species || '').toLowerCase();
      if (type.includes('cat')) cCount++;
      else dCount++;
    });
    
    const tPets = dCount + cCount;
    const dPer = tPets > 0 ? Math.round((dCount / tPets) * 100) : 0;
    const cPer = tPets > 0 ? Math.round((cCount / tPets) * 100) : 0;
    
    const tPetText = cPer > dPer 
      ? `Cat services generated ${cPer}% of total bookings.` 
      : `Dog services generated ${dPer}% of total bookings.`;
      
    const pPrefText = cPer > dPer
      ? `Cats account for ${cPer}% of bookings, indicating a strong preference for cat services.`
      : `Dogs account for ${dPer}% of bookings, indicating a strong preference for dog services.`;

    const validPetIds = new Set(validPets.map((p: any) => p.id));
    const validServices = servicesData.filter((s: any) => validPetIds.has(s.booking_pet_info_id));
    const serviceMap: { [key: string]: number } = {};
    validServices.forEach((s: any) => {
      const name = s.booking_service_name || s.service_name;
      if (name) serviceMap[name] = (serviceMap[name] || 0) + 1;
    });

    const totalValidServices = validServices.length;
    const tServices = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalValidServices > 0 ? Math.round((count / totalValidServices) * 100) : 0
      }));

    // Customer Loyalty & Top Customers pulling matching graph usernames
    const custCounts: Record<string, number> = {};
    const custNames: Record<string, string> = {};
    
    bookingsData.forEach((b: any) => {
      // Prioritize username properties to match the dashboard's top rebooked customers graph
      const name = 
        b.username || 
        b.customer_username || 
        b.profiles?.username || 
        b.customer_name || 
        b.client_name || 
        'Valued Customer';

      // Group directly by the display name used on the chart
      const k = name;
      custCounts[k] = (custCounts[k] || 0) + 1;
      custNames[k] = name;
    });

    let nCustCount = 0;
    const totalUniqueCust = Object.keys(custCounts).length;
    Object.values(custCounts).forEach(c => {
      if (c === 1) nCustCount++;
    });
    const nCustPer = totalUniqueCust > 0 ? Math.round((nCustCount / totalUniqueCust) * 100) : 0;

    const tCustList = Object.entries(custCounts)
      .map(([k, count]) => ({ name: custNames[k] || k, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { 
      dogCount: dCount, catCount: cCount, 
      topPetText: tPetText, topServices: tServices,
      petPrefText: pPrefText, newCustPer: nCustPer, topCustomersList: tCustList
    };
  }, [bookingsData, petsData, servicesData]);

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

          {/* BUSINESS REPORT PREVIEW */}
          {title === 'Business Report' && (
            <>
              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Performance Analysis
              </h3>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Peak Activity:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>
                  Your busiest time slot is typically <strong style={{ color: '#1e3a8a' }}>{peakActivity}</strong>. Consider optimizing staffing during this period.
                </span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Revenue Trend:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>Revenue has remained stable compared to the previous period.</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Booking Trend:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>Booking volume has remained consistent with the previous period.</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Top Performing Pet Type:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>{topPetText}</span>
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Top Services
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                {topServices.length > 0 ? topServices.map((service, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px' }}>#{idx + 1}</span>
                      <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.9rem' }}>{service.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{service.count} bookings</span>
                      <span style={{ background: '#facc15', color: '#1e3a8a', fontSize: '0.85rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px' }}>{service.percentage}%</span>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No service data available.</div>
                )}
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Booking Volume by Pet Type
              </h3>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>Dogs</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{dogCount} bookings</span>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>Cats</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{catCount} bookings</span>
                </div>
              </div>
            </>
          )}

          {/* CUSTOMER INSIGHT REPORT PREVIEW */}
          {title === 'Customer Insight Report' && (
            <>
              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Customer Demographics
              </h3>
              
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Pet Type Preference:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>{petPrefText}</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '1.5rem', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Customer Loyalty:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>
                  New customers make up {newCustPer}% of your customer base. Focus on retention strategies to convert them into loyal customers.
                </span>
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Top Customers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                {topCustomersList.length > 0 ? topCustomersList.map((cust, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#1e3a8a', color: '#ffffff', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px' }}>#{idx + 1}</span>
                      <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.9rem' }}>{cust.name}</span>
                    </div>
                    {/* Handles singular vs plural dynamically based on customer booking count */}
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {cust.count} {cust.count === 1 ? 'booking' : 'bookings'}
                    </span>
                  </div>
                )) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>No customer data available.</div>
                )}
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Customer Reviews
              </h3>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Overall Rating</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', display: 'block', marginBottom: '4px' }}>4.0 / 5.0</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>8 reviews</span>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Staff Rating</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', display: 'block' }}>4.0 / 5.0</span>
                </div>
              </div>
            </>
          )}

          {/* SALES REPORT PREVIEW */}
          {title === 'Sales Report' && (
            <>
              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Sales Analysis
              </h3>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Revenue Trend:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>Revenue has remained stable compared to the previous period.</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Booking Trend:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>Booking volume has remained consistent with the previous period.</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Cancellation Impact:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>
                  {(() => {
                    const cancelledBookings = bookingsData.filter((b: any) => b.booking_status?.toLowerCase() === 'cancelled');
                    const cancelledBookingIds = new Set(cancelledBookings.map((b: any) => b.id));
                    const cancelledPetIds = new Set(petsData.filter((p: any) => cancelledBookingIds.has(p.booking_info_id)).map((p: any) => p.id));
                    const cancellationLoss = servicesData
                      .filter((s: any) => cancelledPetIds.has(s.booking_pet_info_id))
                      .reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);

                    return cancellationLoss > 0
                      ? `Cancellations resulted in a revenue loss of PHP ${cancellationLoss.toLocaleString()} during this period. Consider implementing cancellation policies or improving customer communication.`
                      : `Excellent! No revenue was lost to cancellations during this period.`;
                  })()}
                </span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', borderLeft: '4px solid #facc15' }}>
                <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>Top Performing Pet Type:</span>
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>
                  {(() => {
                    const validRevenueBookings = bookingsData.filter((b: any) => ['paid', 'to_rate', 'rated'].includes(b.booking_status?.toLowerCase()));
                    const revBookingIds = new Set(validRevenueBookings.map((b: any) => b.id));
                    let dRev = 0; let cRev = 0;
                    petsData.forEach((p: any) => {
                      if (revBookingIds.has(p.booking_info_id)) {
                        const pRev = servicesData.filter((s: any) => s.booking_pet_info_id === p.id).reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);
                        const type = String(p.booking_pet_type || p.pet_type || p.species || '').toLowerCase();
                        if (type.includes('cat')) cRev += pRev; else dRev += pRev;
                      }
                    });
                    const tRev = dRev + cRev;
                    const dPer = tRev > 0 ? Math.round((dRev / tRev) * 100) : 0;
                    const cPer = tRev > 0 ? Math.round((cRev / tRev) * 100) : 0;
                    return cPer > dPer ? `Cat services generated ${cPer}% of total revenue` : `Dog services generated ${dPer}% of total revenue`;
                  })()}
                </span>
              </div>

              <h3 className={styles.previewSectionTitle} style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Customer Segmentation
              </h3>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {(() => {
                  const custCounts: Record<string, number> = {};
                  bookingsData.forEach((b: any) => {
                    const k = b.profiles_id || b.customer_id || b.client_id || 'guest';
                    custCounts[k] = (custCounts[k] || 0) + 1;
                  });
                  let nRev = 0; let rRev = 0;
                  const validRevenueBookings = bookingsData.filter((b: any) => ['paid', 'to_rate', 'rated'].includes(b.booking_status?.toLowerCase()));
                  validRevenueBookings.forEach((b: any) => {
                    const k = b.profiles_id || b.customer_id || b.client_id || 'guest';
                    const bPets = new Set(petsData.filter((p: any) => p.booking_info_id === b.id).map((p: any) => p.id));
                    const bRev = servicesData.filter((s: any) => bPets.has(s.booking_pet_info_id)).reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);
                    if ((custCounts[k] || 1) > 1) rRev += bRev; else nRev += bRev;
                  });

                  return (
                    <>
                      <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>New Customers</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>PHP {nRev.toLocaleString()}</span>
                      </div>
                      <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e3a8a', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Returning Customers</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>PHP {rRev.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
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