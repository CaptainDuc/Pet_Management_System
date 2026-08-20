import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  return (
    <View style={styles.c}>
      <Text style={styles.avatar}>👤</Text>
      <Text style={styles.name}>{user?.fullName || 'Pet Owner'}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.role}>{user?.role}</Text>
      <TouchableOpacity style={styles.btn} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#F8F9FE', padding:24 },
  avatar: { fontSize:64, marginBottom:16 },
  name: { fontSize:22, fontWeight:'800', color:'#333' },
  email: { fontSize:14, color:'#888', marginTop:4 },
  role: { fontSize:12, color:'#6C63FF', marginTop:8, fontWeight:'600', textTransform:'uppercase' },
  btn: { backgroundColor:'#FF6B6B', borderRadius:12, padding:16, paddingHorizontal:40, marginTop:32 },
  btnText: { color:'#fff', fontWeight:'700', fontSize:16 },
});
