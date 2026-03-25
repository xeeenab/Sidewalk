import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { authorizedApiFetch } from '../../lib/api';
import { useSession } from '../../providers/session-provider';

type ReportSummary = {
  id: string;
  title: string;
  status: string;
  category: string;
  created_at: string | null;
};

export default function ReportsPlaceholderScreen() {
  const { accessToken } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    authorizedApiFetch<{ data: ReportSummary[] }>('/api/reports/mine?page=1&pageSize=10', accessToken)
      .then((payload) => setReports(payload.data))
      .catch(() => setReports([]));
  }, [accessToken, message]);

  const submitReport = async () => {
    if (!accessToken) {
      setError('Sign in before submitting a report.');
      return;
    }

    try {
      setError(null);
      const payload = await authorizedApiFetch<{ report_id: string }>('/api/reports', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category: 'INFRASTRUCTURE',
          location: {
            type: 'Point',
            coordinates: [3.3515, 6.6018],
          },
          media_urls: [],
        }),
      });
      setMessage(`Report submitted: ${payload.report_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit report.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Quick report submission</Text>
      <Text style={styles.copy}>
        This flow uses the current authenticated mobile session and submits directly to the
        report API while richer media and location capture lands later.
      </Text>

      <TextInput
        onChangeText={setTitle}
        placeholder="Broken streetlight"
        placeholderTextColor="#7a8a82"
        style={styles.input}
        value={title}
      />
      <TextInput
        multiline
        onChangeText={setDescription}
        placeholder="Describe the problem"
        placeholderTextColor="#7a8a82"
        style={[styles.input, styles.textarea]}
        value={description}
      />

      <Pressable onPress={submitReport} style={styles.button}>
        <Text style={styles.buttonText}>Submit report</Text>
      </Pressable>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.listCard}>
        <Text style={styles.listTitle}>My reports</Text>
        {reports.map((report) => (
          <Link href={`/(app)/reports/${report.id}`} key={report.id} style={styles.reportLink}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportMeta}>
              {report.category} · {report.status}
            </Text>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#112219',
  },
  copy: {
    marginTop: 12,
    color: '#51615a',
    lineHeight: 22,
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d2c7b5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fffaf2',
    color: '#112219',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#1f4d3f',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#f8fff8',
    fontWeight: '700',
  },
  success: {
    marginTop: 16,
    color: '#1f4d3f',
    fontWeight: '600',
  },
  error: {
    marginTop: 16,
    color: '#8a1c1c',
    fontWeight: '600',
  },
  listCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#112219',
  },
  reportLink: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ece3d5',
    paddingTop: 16,
  },
  reportTitle: {
    fontWeight: '700',
    color: '#112219',
  },
  reportMeta: {
    marginTop: 4,
    color: '#51615a',
  },
});
