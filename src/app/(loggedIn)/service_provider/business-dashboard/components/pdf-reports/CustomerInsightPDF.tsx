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

  customerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6 },
  customerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeNum: { backgroundColor: '#1e3a8a', color: '#ffffff', fontSize: 8, fontWeight: 'bold', padding: '4px 6px', borderRadius: 4 },
  customerName: { fontWeight: 'bold', color: '#1e3a8a', fontSize: 10 },
  customerCount: { fontSize: 9, color: '#64748b' },

  reviewContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  reviewCard: { width: '48%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  reviewTitle: { fontWeight: 'bold', color: '#1e3a8a', fontSize: 10, marginBottom: 6 },
  reviewScore: { fontWeight: 'bold', color: '#0f172a', fontSize: 14, marginBottom: 4 },
  reviewSubText: { fontSize: 8, color: '#64748b' }
});

export const CustomerInsightPDF = ({ bookings = [], pets = [], month, petTypeFilter, totalRevenue }: any) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalBookings = bookings.filter((b: any) => ['to_rate', 'rated', 'paid'].includes(b.booking_status?.toLowerCase())).length;
  const cancelledBookings = bookings.filter((b: any) => b.booking_status?.toLowerCase() === 'cancelled');

  const validBookingIds = new Set(bookings.map((b: any) => b.id));
  const validPets = pets.filter((p: any) => validBookingIds.has(p.booking_info_id));
  let dogCount = 0; let catCount = 0;
  validPets.forEach((p: any) => {
    const type = String(p.booking_pet_type || p.pet_type || p.species || '').toLowerCase();
    if (type.includes('cat')) catCount++;
    else dogCount++;
  });
  const totalPets = dogCount + catCount;
  const dogPer = totalPets > 0 ? Math.round((dogCount / totalPets) * 100) : 0;
  const catPer = totalPets > 0 ? Math.round((catCount / totalPets) * 100) : 0;
  const petPrefText = catPer > dogPer 
    ? `Cats account for ${catPer}% of bookings, indicating a strong preference for cat services.` 
    : `Dogs account for ${dogPer}% of bookings, indicating a strong preference for dog services.`;

  // Grab the exact username / identifier used by the Top Rebooked Customers graph
  const customerCounts: Record<string, number> = {};
  const customerNames: Record<string, string> = {};
  
  bookings.forEach((b: any) => {
    const name = 
      b.username || 
      b.customer_username || 
      b.profiles?.username || 
      b.customer_name || 
      b.client_name || 
      'Valued Customer';

    const k = name; // Group by the display name directly just like the chart axis
    customerCounts[k] = (customerCounts[k] || 0) + 1;
    customerNames[k] = name;
  });

  let newCustCount = 0;
  const totalUniqueCust = Object.keys(customerCounts).length;
  Object.values(customerCounts).forEach(c => {
    if (c === 1) newCustCount++;
  });
  const newCustPer = totalUniqueCust > 0 ? Math.round((newCustCount / totalUniqueCust) * 100) : 0;

  const topCustomers = Object.entries(customerCounts)
    .map(([k, count]) => ({ name: customerNames[k] || k, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Customer Insight Report</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Period:</Text><Text style={styles.metaValue}>{month || 'monthly'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Type:</Text><Text style={styles.metaValue}>Customer Insights</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Pet Type Filter:</Text><Text style={styles.metaValue}>{petTypeFilter || 'all'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Generated:</Text><Text style={styles.metaValue}>{currentDate}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.gridContainer}>
          <View style={styles.card}><Text style={styles.cardLabel}>GROSS REVENUE</Text><Text style={styles.cardValue}>PHP {totalRevenue || 0}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>TOTAL BOOKINGS</Text><Text style={styles.cardValue}>{totalBookings}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>LISTING VISITORS</Text><Text style={styles.cardValue}>0</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>AVG BOOKINGS/CUSTOMER</Text><Text style={styles.cardValue}>0</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>CANCELLATIONS</Text><Text style={styles.cardValue}>{cancelledBookings.length}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Customer Demographics</Text>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Pet Type Preference:</Text>
          <Text style={styles.analysisText}>{petPrefText}</Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Customer Loyalty:</Text>
          <Text style={styles.analysisText}>New customers make up {newCustPer}% of your customer base. Focus on retention strategies to convert them into loyal customers.</Text>
        </View>

        <Text style={styles.sectionTitle}>Top Customers</Text>
        {topCustomers.length > 0 ? (
          topCustomers.map((cust, idx) => (
            <View key={idx} style={styles.customerCard}>
              <View style={styles.customerLeft}>
                <Text style={styles.badgeNum}>#{idx + 1}</Text>
                <Text style={styles.customerName}>{cust.name}</Text>
              </View>
              <Text style={styles.customerCount}>{cust.count} {cust.count === 1 ? 'booking' : 'bookings'}</Text>
            </View>
          ))
        ) : (
          <View style={styles.analysisBox}><Text style={styles.analysisText}>No customer data available for this period.</Text></View>
        )}

        <Text style={styles.sectionTitle}>Customer Reviews</Text>
        <View style={styles.reviewContainer}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Overall Rating</Text>
            <Text style={styles.reviewScore}>4.0 / 5.0</Text>
            <Text style={styles.reviewSubText}>8 reviews</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Staff Rating</Text>
            <Text style={styles.reviewScore}>4.0 / 5.0</Text>
            <Text style={styles.reviewSubText}> </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};