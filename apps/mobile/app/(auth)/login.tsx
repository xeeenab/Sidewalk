import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiFetch } from '../lib/api';
import { useSession } from '../providers/session-provider';

export default function LoginScreen() {
  const { accessToken, isHydrated, setSession } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isHydrated && accessToken) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const requestOtp = async () => {
    try {
      setError(null);
      const payload = await apiFetch<{ expiresInSeconds: number }>('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setMessage(`OTP requested. Expires in about ${Math.ceil(payload.expiresInSeconds / 60)} minutes.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request OTP.');
    }
  };

  const verifyOtp = async () => {
    try {
      setError(null);
      const payload = await apiFetch<{ accessToken: string; refreshToken: string }>(
        '/api/auth/verify-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            code,
            deviceId: 'mobile-handset',
            clientType: 'mobile',
            role: 'CITIZEN',
          }),
        },
      );
      await setSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      });
      setMessage('Signed in successfully.');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify OTP.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Sidewalk Mobile</Text>
      <Text style={styles.title}>OTP login ready.</Text>
      <Text style={styles.copy}>
        Request a login code, verify it, and persist the mobile session for app restarts.
      </Text>

      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="citizen@example.com"
        placeholderTextColor="#7a8a82"
        style={styles.input}
        value={email}
      />
      <TextInput
        keyboardType="number-pad"
        onChangeText={setCode}
        placeholder="123456"
        placeholderTextColor="#7a8a82"
        style={styles.input}
        value={code}
      />

      <Pressable onPress={requestOtp} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Request OTP</Text>
      </Pressable>
      <Pressable onPress={verifyOtp} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Verify OTP</Text>
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
    backgroundColor: '#f4efe6',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#2f5d50',
    marginBottom: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#112219',
  },
  copy: {
    marginTop: 16,
    color: '#405149',
    lineHeight: 22,
  },
  input: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#d2c7b5',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    color: '#112219',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#1f4d3f',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f8fff8',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d2c7b5',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#112219',
    fontWeight: '700',
  },
  success: {
    marginTop: 18,
    color: '#1f4d3f',
    fontWeight: '600',
  },
  error: {
    marginTop: 18,
    color: '#8a1c1c',
    fontWeight: '600',
  },
});
