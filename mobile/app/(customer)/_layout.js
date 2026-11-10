import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE = '#1D4ED8';
const INACTIVE = '#98A2B3';

function TabIcon({ name, color, focused }) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />;
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Ưu đãi',
          tabBarIcon: ({ color, focused }) => <TabIcon name="gift" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={styles.fab}>
              <Ionicons name="calendar" size={25} color="#FFFFFF" />
              <View style={styles.fabPlus}>
                <Ionicons name="add" size={12} color={ACTIVE} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tôi',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person" color={color} focused={focused} />,
        }}
      />

      <Tabs.Screen name="pets" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="loyalty" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="ai-assistant" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EEF1F6',
    borderTopWidth: 1,
    elevation: 16,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: ACTIVE,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabPlus: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
