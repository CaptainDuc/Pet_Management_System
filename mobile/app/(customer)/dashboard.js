import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function CustomerDashboard() {
  const { user } = useAuthStore();

  const quickActions = [
    { label: 'Book Service', icon: '📅', route: '/(customer)/booking' },
    { label: 'My Pets', icon: '🐾', route: '/(customer)/pets' },
    { label: 'Appointments', icon: '🏥', route: '/(customer)/appointments' },
    { label: 'AI Assistant', icon: '🤖', route: '/(customer)/ai-assistant' },
    { label: 'Loyalty Points', icon: '⭐', route: '/(customer)/loyalty' },
    { label: 'Invoices', icon: '🧾', route: '/(customer)/invoices' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.fullName?.split(' ')[0] || 'Pet Owner'} 👋</Text>
        <Text style={styles.subtext}>What can we help you with today?</Text>
      </View>

      <View style={styles.grid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.card}
            onPress={() => router.push(action.route)}
          >
            <Text style={styles.icon}>{action.icon}</Text>
            <Text style={styles.cardLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { backgroundColor: '#6C63FF', padding: 24, paddingTop: 40 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtext: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  icon: { fontSize: 32, marginBottom: 8 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
});
