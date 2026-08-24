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

export const CustomerInsightPDF = ({ bookings, month, petTypeFilter }: any) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalBookings = bookings.length;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Monthly Customer Insight Summary</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Report Type:</Text><Text style={styles.metaValue}>Monthly Customer Insight Summary</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Pet Type Filter:</Text><Text style={styles.metaValue}>{petTypeFilter || 'all'}</Text></View>
          <View style={styles.metaRow}><Text style={styles.metaLabel}>Generated:</Text><Text style={styles.metaValue}>{currentDate}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.gridContainer}>
          <View style={styles.card}><Text style={styles.cardLabel}>GROSS REVENUE</Text><Text style={styles.cardValue}>PHP 0</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>TOTAL BOOKINGS</Text><Text style={styles.cardValue}>{totalBookings}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>LISTING VISITORS</Text><Text style={styles.cardValue}>0</Text><Text style={styles.trendText}>0% vs previous period</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>AVG BOOKINGS/CUSTOMER</Text><Text style={styles.cardValue}>0</Text><Text style={styles.trendText}>0% vs previous period</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>CANCELLATIONS</Text><Text style={styles.cardValue}>0</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Customer Demographics</Text>
        <View style={styles.analysisBox}>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.analysisHeading}>Pet Type Preference:</Text>
            <Text style={styles.analysisText}>Dog and cat bookings are evenly balanced.</Text>
          </View>
          <View>
            <Text style={styles.analysisHeading}>Customer Loyalty:</Text>
            <Text style={styles.analysisText}>New customers make up 0% of your customer base. Focus on retention strategies to convert them into loyal customers.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Customer Reviews</Text>
        <View style={styles.analysisBox}>
          <View style={{ marginBottom: 6 }}><Text style={styles.analysisHeading}>Overall Rating:</Text><Text style={styles.analysisText}>0.0 / 5.0 (0 reviews)</Text></View>
          <View><Text style={styles.analysisHeading}>Staff Rating:</Text><Text style={styles.analysisText}>0.0 / 5.0</Text></View>
        </View>
      </Page>
    </Document>
  );
};