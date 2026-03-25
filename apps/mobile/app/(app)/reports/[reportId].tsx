import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { authorizedApiFetch } from '../../lib/api';
import { useSession } from '../../providers/session-provider';

type ReportDetail = {
  title: string;
  description: string;
  status: string;
  category: string;
  district: string | null;
  history: Array<{
    status: string;
    note: string | null;
    createdAt: string | null;
  }>;
};

export default function ReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { accessToken } = useSession();
  const [report, setReport] = useState<ReportDetail | null>(null);

  useEffect(() => {
    if (!accessToken || !reportId) {
      return;
    }

    authorizedApiFetch<ReportDetail>(`/api/reports/${reportId}`, accessToken)
      .then(setReport)
      .catch(() => setReport(null));
  }, [accessToken, reportId]);

  if (!report) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{report.title}</Text>
      <Text style={styles.meta}>
        {report.category} · {report.status} · {report.district ?? 'No district'}
      </Text>
      <Text style={styles.description}>{report.description}</Text>

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>History</Text>
        {report.history.length === 0 ? (
          <Text style={styles.historyItem}>No status updates yet.</Text>
        ) : (
          report.history.map((entry, index) => (
            <View key={`${entry.status}-${entry.createdAt}-${index}`} style={styles.historyRow}>
              <Text style={styles.historyStatus}>{entry.status}</Text>
              <Text style={styles.historyItem}>{entry.note ?? 'Status updated'}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 24,
    backgroundColor: '#fffaf2',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#112219',
  },
  meta: {
    marginTop: 12,
    color: '#405149',
  },
  description: {
    marginTop: 18,
    color: '#1e2c26',
    lineHeight: 22,
  },
  historyCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#112219',
  },
  historyRow: {
    marginTop: 16,
  },
  historyStatus: {
    fontWeight: '700',
    color: '#1f4d3f',
  },
  historyItem: {
    marginTop: 4,
    color: '#51615a',
  },
});
