import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', backgroundColor: '#ffffff', color: '#1e293b', fontSize: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e3a8a' },
  metaGrid: { marginBottom: 15, padding: 10, backgroundColor: '#f8fafc', borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  metaLabel: { width: '35%', fontWeight: 'bold', color: '#475569' },
  metaValue: { width: '65%', color: '#334155' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginTop: 10, marginBottom: 8, color: '#1e3a8a', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 4 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  card: { width: '31%', backgroundColor: '#f8fafc', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  cardLabel: { fontSize: 7, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  trendText: { fontSize: 6, color: '#64748b', marginTop: 2 },
  analysisBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  analysisHeading: { fontWeight: 'bold', color: '#1e3a8a', marginBottom: 2, fontSize: 9 },
  analysisText: { color: '#475569', fontSize: 9 }
});

export const BusinessReportPDF = ({ bookings, month, petTypeFilter, totalRevenue }: any) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalBookings = bookings.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Business Summary Report</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Period:</Text><Text style={styles.metaValue}>{month || 'monthly'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Type:</Text><Text style={styles.metaValue}>Monthly Summary</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Pet Type Filter:</Text><Text style={styles.metaValue}>{petTypeFilter || 'all'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Generated:</Text><Text style={styles.metaValue}>{currentDate}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.gridContainer}>
          <View style={styles.card}><Text style={styles.cardLabel}>GROSS REVENUE</Text><Text style={styles.cardValue}>PHP {totalRevenue || 0}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>TOTAL BOOKINGS</Text><Text style={styles.cardValue}>{totalBookings}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>LISTING VISITORS</Text><Text style={styles.cardValue}>0</Text><Text style={styles.trendText}>0% vs previous period</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>AVG BOOKINGS/CUSTOMER</Text><Text style={styles.cardValue}>0</Text><Text style={styles.trendText}>0% vs previous period</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>CANCELLATIONS</Text><Text style={styles.cardValue}>0</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Performance Analysis</Text>
        <View style={styles.analysisBox}>
          <View style={{ marginBottom: 6 }}><Text style={styles.analysisHeading}>Peak Activity:</Text><Text style={styles.analysisText}>Your busiest time slot is typically No data. Consider optimizing staffing during this period.</Text></View>
          <View style={{ marginBottom: 6 }}><Text style={styles.analysisHeading}>Revenue Trend:</Text><Text style={styles.analysisText}>Revenue has remained stable compared to the previous period.</Text></View>
          <View style={{ marginBottom: 6 }}><Text style={styles.analysisHeading}>Booking Trend:</Text><Text style={styles.analysisText}>Booking volume has remained consistent with the previous period.</Text></View>
          <View><Text style={styles.analysisHeading}>Top Performing Pet Type:</Text><Text style={styles.analysisText}>Cat services generated 0% of total revenue</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Booking Volume by Pet Type</Text>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisText}>• Dogs: 0 bookings</Text>
          <Text style={styles.analysisText}>• Cats: 0 bookings</Text>
        </View>
      </Page>
    </Document>
  );
};