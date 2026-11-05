import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const vouchers = [
  {
    title: 'Giảm 50% Tắm Spa lần đầu',
    subtitle: 'Áp dụng cho khách hàng mới tại chi nhánh Quận 7',
    code: 'BOSS50',
    color: '#F97316',
    icon: 'bathtub-outline',
  },
  {
    title: 'Hoàn 50.000 Xu đặt lịch đầu tiên',
    subtitle: 'Nhận Xu ngay sau khi hoàn tất dịch vụ',
    code: 'NEW50K',
    color: '#2F5BFF',
    icon: 'calendar-star',
  },
  {
    title: 'Giảm 30% gói hội viên VIP',
    subtitle: 'Đặc quyền chăm sóc boss cưng cả năm',
    code: 'VIP30',
    color: '#E11D48',
    icon: 'crown-outline',
  },
];

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 }}
      >
        <LinearGradient
          colors={['#2B4BE0', '#1D3BCB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          <View style={styles.headerCircle} />
          <Text style={styles.headerEyebrow}>Pet Service</Text>
          <Text style={styles.headerTitle}>Ưu đãi dành cho boss</Text>
          <Text style={styles.headerSub}>Săn voucher mỗi ngày, chăm boss tiết kiệm hơn.</Text>

          <View style={styles.headerStats}>
            <View>
              <Text style={styles.headerStatValue}>450 Xu</Text>
              <Text style={styles.headerStatLabel}>Điểm hiện có</Text>
            </View>
            <View style={styles.headerDivider} />
            <View>
              <Text style={styles.headerStatValue}>12</Text>
              <Text style={styles.headerStatLabel}>Voucher khả dụng</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={19} color="#F97316" />
            <Text style={styles.sectionTitle}>VOUCHER CỦA BẠN</Text>
          </View>
          <Text style={styles.sectionSub}>Dùng ngay</Text>
        </View>

        <View style={styles.list}>
          {vouchers.map((item) => (
            <Pressable
              key={item.code}
              onPress={() => router.push('/(customer)/booking')}
              style={({ pressed }) => [styles.voucher, pressed && { opacity: 0.75 }]}
            >
              <View style={[styles.voucherIcon, { backgroundColor: `${item.color}18` }]}>
                <MaterialCommunityIcons name={item.icon} size={26} color={item.color} />
              </View>
              <View style={styles.voucherBody}>
                <Text style={styles.voucherTitle}>{item.title}</Text>
                <Text style={styles.voucherSub}>{item.subtitle}</Text>
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#C3C8D4" />
            </Pressable>
          ))}
        </View>

        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#B77900" />
          <View style={styles.tipBody}>
            <Text style={styles.tipTitle}>Mẹo săn ưu đãi</Text>
            <Text style={styles.tipText}>
              Đặt lịch trước 1 ngày và chọn thanh toán PetPay để nhận thêm Xu hoàn tiền.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -90,
    right: -60,
  },
  headerEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 7,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 18,
  },
  headerStatValue: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  headerStatLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    marginTop: 2,
  },
  headerDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#101828',
  },
  sectionSub: {
    fontSize: 11,
    color: '#2F5BFF',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 11,
  },
  voucher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  voucherIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBody: {
    flex: 1,
  },
  voucherTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#101828',
  },
  voucherSub: {
    fontSize: 10.5,
    lineHeight: 15,
    color: '#8A93A6',
    marginTop: 3,
  },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F6FF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 7,
  },
  codeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2F5BFF',
    letterSpacing: 0.5,
  },
  tipCard: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: '#FFF7DB',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
  },
  tipBody: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7A4A00',
  },
  tipText: {
    fontSize: 10.5,
    lineHeight: 16,
    color: '#8A6A22',
    marginTop: 3,
  },
});
