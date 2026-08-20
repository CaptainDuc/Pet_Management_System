import { View, Text, StyleSheet } from 'react-native';
export default function BookingScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.emoji}>📅</Text>
      <Text style={styles.title}>Book a Service</Text>
      <Text style={styles.sub}>Select branch, service, and time</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#F8F9FE' },
  emoji: { fontSize:48, marginBottom:16 },
  title: { fontSize:22, fontWeight:'700', color:'#333' },
  sub: { fontSize:14, color:'#aaa', marginTop:8 },
});
