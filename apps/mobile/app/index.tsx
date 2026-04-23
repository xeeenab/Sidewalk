import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSession } from './providers/session-provider';

export default function IndexScreen() {
  const { accessToken, isHydrating } = useSession();

  if (isHydrating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f4d3f" />
      </View>
    );
  }

  return <Redirect href={accessToken ? '/(app)/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffaf2',
  },
});
