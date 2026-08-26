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
  
  serviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6 },
  serviceLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeNum: { backgroundColor: '#1e3a8a', color: '#ffffff', fontSize: 8, fontWeight: 'bold', padding: '4px 6px', borderRadius: 4 },
  serviceName: { fontWeight: 'bold', color: '#1e3a8a', fontSize: 10 },
  serviceRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceCount: { fontSize: 9, color: '#64748b' },
  percentagePill: { backgroundColor: '#facc15', color: '#1e3a8a', fontSize: 9, fontWeight: 'bold', padding: '3px 8px', borderRadius: 10 },

  petVolumeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  petVolumeCard: { width: '48%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  petVolumeTitle: { fontWeight: 'bold', color: '#1e3a8a', fontSize: 10, marginBottom: 4 },
  petVolumeValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 13 }
});

export const BusinessReportPDF = ({ bookings = [], pets = [], services = [], month, petTypeFilter, totalRevenue, peakActivity = '12:00 PM' }: any) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalBookings = bookings.length;

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
  const topPetText = catPer > dogPer 
    ? `Cat services generated ${catPer}% of total bookings.` 
    : `Dog services generated ${dogPer}% of total bookings.`;

  const validPetIds = new Set(validPets.map((p: any) => p.id));
  const validServices = services.filter((s: any) => validPetIds.has(s.booking_pet_info_id));
  const serviceMap: { [key: string]: number } = {};
  
  validServices.forEach((s: any) => {
    const name = s.booking_service_name || s.service_name;
    if (name) serviceMap[name] = (serviceMap[name] || 0) + 1;
  });
  
  const totalValidServices = validServices.length;
  const topServices = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalValidServices > 0 ? Math.round((count / totalValidServices) * 100) : 0
    }));

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
          <Text style={styles.analysisHeading}>Peak Activity:</Text>
          <Text style={styles.analysisText}>Your busiest time slot is typically {peakActivity}. Consider optimizing staffing during this period.</Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Revenue Trend:</Text>
          <Text style={styles.analysisText}>Revenue has remained stable compared to the previous period.</Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Booking Trend:</Text>
          <Text style={styles.analysisText}>Booking volume has remained consistent with the previous period.</Text>
        </View>
        <View style={styles.analysisBox}>
          <Text style={styles.analysisHeading}>Top Performing Pet Type:</Text>
          <Text style={styles.analysisText}>{topPetText}</Text>
        </View>

        <Text style={styles.sectionTitle}>Top Services</Text>
        {topServices.length > 0 ? (
          topServices.map((service, idx) => (
            <View key={idx} style={styles.serviceCard}>
              <View style={styles.serviceLeft}>
                <Text style={styles.badgeNum}>#{idx + 1}</Text>
                <Text style={styles.serviceName}>{service.name}</Text>
              </View>
              <View style={styles.serviceRight}>
                <Text style={styles.serviceCount}>{service.count} bookings</Text>
                <Text style={styles.percentagePill}>{service.percentage}%</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.analysisBox}><Text style={styles.analysisText}>No service data available for this period.</Text></View>
        )}

        <Text style={styles.sectionTitle}>Booking Volume by Pet Type</Text>
        <View style={styles.petVolumeContainer}>
          <View style={styles.petVolumeCard}>
            <Text style={styles.petVolumeTitle}>Dogs</Text>
            <Text style={styles.petVolumeValue}>{dogCount} bookings</Text>
          </View>
          <View style={styles.petVolumeCard}>
            <Text style={styles.petVolumeTitle}>Cats</Text>
            <Text style={styles.petVolumeValue}>{catCount} bookings</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};