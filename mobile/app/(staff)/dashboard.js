import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
export default function StaffDashboard() {
  const stats = [
    { label: "Today's Appointments", value: '8', color: '#FF6B35' },
    { label: 'Pending Confirmations', value: '3', color: '#6C63FF' },
    { label: 'In Progress', value: '2', color: '#4CAF50' },
    { label: 'Completed Today', value: '12', color: '#2196F3' },
  ];
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Dashboard 🏥</Text>
        <Text style={styles.sub}>Manage your appointments and tasks</Text>
      </View>
      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.card, { borderLeftColor: s.color }]}>
            <Text style={[styles.value, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#F8F9FE' },
  header: { backgroundColor:'#FF6B35', padding:24, paddingTop:40 },
  title: { fontSize:22, fontWeight:'800', color:'#fff' },
  sub: { fontSize:14, color:'rgba(255,255,255,0.8)', marginTop:4 },
  grid: { padding:16, gap:12 },
  card: { backgroundColor:'#fff', borderRadius:12, padding:20, borderLeftWidth:4, elevation:2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:8 },
  value: { fontSize:32, fontWeight:'800' },
  label: { fontSize:13, color:'#666', marginTop:4 },
});
