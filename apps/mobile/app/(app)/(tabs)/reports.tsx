import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { authorizedApiFetch } from '../../lib/api';
import { useSession } from '../../providers/session-provider';

export default function ReportsPlaceholderScreen() {
  const { accessToken } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <View style={styles.container}>
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
    </View>
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
});
