// pdf visual

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DashboardCounts, DateRange } from '../_types';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#1a1a1a' },
  infoSection: { marginBottom: 20, fontSize: 10, color: '#666' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333', borderBottom: '1px solid #eee', paddingBottom: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  kpiBox: { width: '48%', padding: 10, marginBottom: 10, backgroundColor: '#f8f9fa', borderRadius: 4, marginRight: '2%' },
  kpiLabel: { fontSize: 10, color: '#666', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  insightItem: { marginBottom: 12 },
  insightTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  insightText: { fontSize: 10, color: '#444', lineHeight: 1.4 },
  actionBox: { padding: 8, marginBottom: 8, borderLeft: '3px solid #000', backgroundColor: '#fafafa' },
  actionText: { fontSize: 10, color: '#222' }
});

interface Props {
  counts: DashboardCounts;
  dateRange: DateRange;
}

export const AdminReportDocument = ({ counts, dateRange }: Props) => {
  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const { pendingCount, activeCount, rejectedCount, totalUsers, avgApprovalTime } = counts;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Admin Dashboard Report</Text>
        
        <View style={styles.infoSection}>
          <Text>Report Generated: {generatedDate}</Text>
          {(dateRange.start || dateRange.end) && (
            <Text>Date Filter Applied: {dateRange.start} to {dateRange.end || 'Present'}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.grid}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Pending Approvals</Text>
            <Text style={styles.kpiValue}>{pendingCount}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Active Listings</Text>
            <Text style={styles.kpiValue}>{activeCount}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Rejected Listings</Text>
            <Text style={styles.kpiValue}>{rejectedCount}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Users</Text>
            <Text style={styles.kpiValue}>{totalUsers}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Avg Approval Time</Text>
            <Text style={styles.kpiValue}>{avgApprovalTime}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Platform Insights</Text>
        <View style={styles.insightItem}>
          <Text style={styles.insightTitle}>Application Status:</Text>
          <Text style={styles.insightText}>
            {pendingCount > 0
              ? `There are currently ${pendingCount} complete application(s) pending review.`
              : "All applications have been reviewed."}
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightTitle}>Service Provider Network:</Text>
          <Text style={styles.insightText}>
            The platform has {activeCount} active service provider(s) available.
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Text style={styles.insightTitle}>Approval Efficiency:</Text>
          <Text style={styles.insightText}>
            Applications are being approved in an average of {avgApprovalTime}.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recommended Actions</Text>
        {pendingCount > 0 && (
          <View style={[styles.actionBox, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.actionText}>Review {pendingCount} pending application(s) to maintain quality standards.</Text>
          </View>
        )}
        {pendingCount === 0 && (
          <View style={[styles.actionBox, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.actionText}>All applications reviewed - No pending items.</Text>
          </View>
        )}
        {activeCount < 10 && (
          <View style={[styles.actionBox, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.actionText}>Consider marketing initiatives to attract more service providers.</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};