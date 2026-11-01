import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fluora</Text>
      <Text style={styles.subtitle}>Mobile scaffold is ready.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#236B58',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#52625D',
    fontSize: 16,
    marginTop: 8,
  },
});
