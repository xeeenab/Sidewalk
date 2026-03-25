import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../providers/session-provider';

export default function SettingsPlaceholderScreen() {
  const { clearSession } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings placeholder</Text>
      <Text style={styles.copy}>Session controls and profile settings will land here.</Text>
      <Pressable onPress={() => void clearSession()} style={styles.button}>
        <Text style={styles.buttonText}>Clear local session</Text>
      </Pressable>
      <Link href="/(auth)/login" style={styles.link}>
        Return to auth shell
      </Link>
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
  button: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#d2c7b5',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: {
    color: '#112219',
    fontWeight: '700',
  },
  link: {
    marginTop: 20,
    color: '#1f4d3f',
    fontWeight: '700',
  },
});
