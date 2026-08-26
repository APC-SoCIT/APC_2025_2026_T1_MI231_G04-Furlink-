import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', backgroundColor: '#ffffff', color: '#1e293b', fontSize: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e3a8a' },
  metaGrid: { marginBottom: 15, padding: 10, backgroundColor: '#f8fafc', borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { width: '35%', fontWeight: 'bold', color: '#475569' },
  metaValue: { width: '65%', color: '#334155' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginTop: 12, marginBottom: 8, color: '#1e3a8a', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 4 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  card: { width: '31%', backgroundColor: '#f8fafc', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  cardLabel: { fontSize: 7, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  trendText: { fontSize: 6, color: '#64748b', marginTop: 2 },
  analysisBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#facc15' },
  analysisHeading: { fontWeight: 'bold', color: '#1e3a8a', marginBottom: 2, fontSize: 9 },
  analysisText: { color: '#475569', fontSize: 9 },

  segmentContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  segmentCard: { width: '48%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  segmentTitle: { fontWeight: 'bold', color: '#1e3a8a', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' },
  segmentValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 13 }
});

export const SalesReportPDF = ({ bookings = [], pets = [], services = [], month, petTypeFilter, totalRevenue }: any) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalBookings = bookings.filter((b: any) => ['to_rate', 'rated', 'paid'].includes(b.booking_status?.toLowerCase())).length;

  // 1. Calculate Cancellation Loss
  const cancelledBookings = bookings.filter((b: any) => b.booking_status?.toLowerCase() === 'cancelled');
  const cancelledBookingIds = new Set(cancelledBookings.map((b: any) => b.id));
  const cancelledPetIds = new Set(pets.filter((p: any) => cancelledBookingIds.has(p.booking_info_id)).map((p: any) => p.id));
  const cancellationLoss = services
    .filter((s: any) => cancelledPetIds.has(s.booking_pet_info_id))
    .reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);

  // 2. Calculate Top Performing Pet Type by Revenue
  const validRevenueBookings = bookings.filter((b: any) => ['paid', 'to_rate', 'rated'].includes(b.booking_status?.toLowerCase()));
  const revBookingIds = new Set(validRevenueBookings.map((b: any) => b.id));
  
  let dogRevenue = 0;
  let catRevenue = 0;
  pets.forEach((p: any) => {
    if (revBookingIds.has(p.booking_info_id)) {
      const pId = p.id;
      const pRevenue = services
        .filter((s: any) => s.booking_pet_info_id === pId)
        .reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);
      
      const type = String(p.booking_pet_type || p.pet_type || p.species || '').toLowerCase();
      if (type.includes('cat')) catRevenue += pRevenue;
      else dogRevenue += pRevenue;
    }
  });

  const totalPetRev = dogRevenue + catRevenue;
  const dogRevPer = totalPetRev > 0 ? Math.round((dogRevenue / totalPetRev) * 100) : 0;
  const catRevPer = totalPetRev > 0 ? Math.round((catRevenue / totalPetRev) * 100) : 0;
  const topPetSalesText = catRevPer > dogRevPer 
    ? `Cat services generated ${catRevPer}% of total revenue` 
    : `Dog services generated ${dogRevPer}% of total revenue`;

  // 3. Customer Segmentation (New vs Returning Revenue)
  // Track customer booking history based on client/profile identifiers in bookings
  const customerBookingCounts: Record<string, number> = {};
  bookings.forEach((b: any) => {
    const customerKey = b.profiles_id || b.customer_id || b.client_id || 'guest';
    customerBookingCounts[customerKey] = (customerBookingCounts[customerKey] || 0) + 1;
  });

  let newCustRevenue = 0;
  let retCustRevenue = 0;

  validRevenueBookings.forEach((b: any) => {
    const customerKey = b.profiles_id || b.customer_id || b.client_id || 'guest';
    const bPetIds = new Set(pets.filter((p: any) => p.booking_info_id === b.id).map((p: any) => p.id));
    const bRev = services
      .filter((s: any) => bPetIds.has(s.booking_pet_info_id))
      .reduce((sum: number, s: any) => sum + Number(s.booking_price || 0), 0);

    // If this customer has more than 1 booking total, count as returning
    if ((customerBookingCounts[customerKey] || 1) > 1) {
      retCustRevenue += bRev;
    } else {
      newCustRevenue += bRev;
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Sales Summary Report</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Period:</Text><Text style={styles.metaValue}>{month || 'monthly'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Type:</Text><Text style={styles.metaValue}>Sales Summary</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Pet Type Filter:</Text><Text style={styles.metaValue}>{petTypeFilter || 'all'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Generated:</Text><Text style={styles.metaValue}>{currentDate}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.gridContainer}>
          <View style={styles.card}><Text style={styles.cardLabel}>GROSS REVENUE</Text><Text style={styles.cardValue}>PHP {totalRevenue || 0}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>TOTAL BOOKINGS</Text><Text style={styles.cardValue}>{totalBookings}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>LISTING VISITORS</Text><Text style={styles.cardValue}>0</Text><Text style={styles.trendText}>0% vs previous period</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>AVG BOOKINGS/CUSTOMER</Text><Text style={styles.cardValue}>0</Text><Text style={styles.trendText}>0% vs previous period</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>CANCELLATIONS</Text><Text style={styles.cardValue}>{cancelledBookings.length}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Sales Analysis</Text>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Revenue Trend:</Text>
          <Text style={styles.analysisText}>Revenue has remained stable compared to the previous period.</Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Booking Trend:</Text>
          <Text style={styles.analysisText}>Booking volume has remained consistent with the previous period.</Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Cancellation Impact:</Text>
          <Text style={styles.analysisText}>
            {cancellationLoss > 0 
              ? `Cancellations resulted in a revenue loss of PHP ${cancellationLoss.toLocaleString()} during this period. Consider implementing cancellation policies or improving customer communication.`
              : `Excellent! No revenue was lost to cancellations during this period.`}
          </Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Top Performing Pet Type:</Text>
          <Text style={styles.analysisText}>{topPetSalesText}</Text>
        </View>

        <Text style={styles.sectionTitle}>Customer Segmentation</Text>
        <View style={styles.segmentContainer}>
          <View style={styles.segmentCard}>
            <Text style={styles.segmentTitle}>New Customers</Text>
            <Text style={styles.segmentValue}>PHP {newCustRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.segmentCard}>
            <Text style={styles.segmentTitle}>Returning Customers</Text>
            <Text style={styles.segmentValue}>PHP {retCustRevenue.toLocaleString()}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};