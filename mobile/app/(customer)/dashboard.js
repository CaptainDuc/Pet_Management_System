import { useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  blue: '#2F5BFF',
  navy: '#0B1B4D',
  bg: '#F5F6FA',
  text: '#101828',
  muted: '#8A93A6',
  border: '#EEF1F6',
  yellow: '#F5B400',
  green: '#16A34A',
  red: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F59E0B',
};

const quickActions = [
  {
    label: 'Đặt lịch ngay',
    icon: 'calendar-check-outline',
    color: '#2563EB',
    bg: '#EEF4FF',
    route: '/(customer)/booking',
  },
  {
    label: 'Bác sĩ tại nhà',
    icon: 'home-heart',
    color: '#16A34A',
    bg: '#EAFBF1',
    route: '/(customer)/booking',
  },
  {
    label: 'Quét thẻ Boss',
    icon: 'qrcode-scan',
    color: '#7C3AED',
    bg: '#F3EDFF',
    route: '/(customer)/loyalty',
  },
  {
    label: 'Kho Voucher',
    icon: 'wallet-giftcard',
    color: '#D97706',
    bg: '#FFF7E6',
    dot: true,
    route: '/(customer)/promotions',
  },
];

const services = [
  {
    label: 'Tắm Spa & Vệ Sinh',
    icon: 'bathtub-outline',
    bg: '#2F6BFF',
    badge: 'HOT',
    badgeColor: '#EF4444',
  },
  {
    label: 'Cắt Tỉa Tạo Kiểu',
    icon: 'content-cut',
    bg: '#8B5CF6',
  },
  {
    label: 'Khám & Tiêm Phòng',
    icon: 'needle',
    bg: '#16A34A',
    badge: '+15K Xu',
    badgeColor: '#F59E0B',
  },
  {
    label: 'Khách Sạn Thú Cưng',
    icon: 'office-building',
    bg: '#F59E0B',
  },
  {
    label: 'Cấp Cứu 24/7',
    icon: 'medical-bag',
    bg: '#EF4444',
    labelColor: '#DC2626',
  },
  {
    label: 'Huấn Luyện Cún Cưng',
    icon: 'dog',
    bg: '#0EA5E9',
  },
  {
    label: 'Đặt Cún Đi Dạo',
    icon: 'walk',
    bg: '#22C55E',
  },
  {
    label: 'Xem thêm dịch vụ',
    icon: 'view-grid-outline',
    bg: '#E5E7EB',
    iconColor: '#111827',
  },
];

const healthServices = [
  { label: 'Sổ Y Bạ Điện Tử', icon: 'clipboard-pulse-outline', color: '#F43F5E', bg: '#FFF1F2' },
  { label: 'Xét Nghiệm Tại Nhà', icon: 'flask-outline', color: '#3B82F6', bg: '#EEF4FF' },
  { label: 'Bảo Hiểm Thú Cưng', icon: 'shield-check-outline', color: '#10B981', bg: '#ECFDF5' },
  { label: 'Tư Vấn Dinh Dưỡng', icon: 'food-apple-outline', color: '#F59E0B', bg: '#FFF7ED' },
];

const promos = [
  {
    tag: 'ƯU ĐÃI HOT',
    title: 'Tắm Spa Lần Đầu',
    caption: 'GIẢM ĐẾN',
    value: '50%',
    colors: ['#FF9F1C', '#F97316'],
    icon: 'bathtub-outline',
  },
  {
    tag: 'BẠN MỚI',
    title: 'Đặt Lịch Đầu Tiên',
    caption: 'HOÀN NGAY',
    value: '50.000 XU',
    colors: ['#3B82F6', '#1D4ED8'],
    icon: 'calendar-star',
  },
  {
    tag: 'GIỚI THIỆU',
    title: 'Mời Bạn Bè',
    caption: 'NHẬN THÊM',
    value: '100.000 XU',
    colors: ['#FB7185', '#E11D48'],
    icon: 'account-multiple-plus-outline',
  },
];

function QuickAction({ item }) {
  return (
    <Pressable
      onPress={() => router.push(item.route)}
      style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: item.bg }]}>
        <MaterialCommunityIcons name={item.icon} size={25} color={item.color} />
        {item.dot ? <View style={styles.quickDot} /> : null}
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function ServiceItem({ item }) {
  return (
    <Pressable
      onPress={() => router.push('/(customer)/booking')}
      style={({ pressed }) => [styles.serviceItem, pressed && styles.pressed]}
    >
      <View style={[styles.serviceIcon, { backgroundColor: item.bg }]}>
        <MaterialCommunityIcons
          name={item.icon}
          size={27}
          color={item.iconColor || '#FFFFFF'}
        />
        {item.badge ? (
          <View style={[styles.serviceBadge, { backgroundColor: item.badgeColor }]}>
            <Text style={styles.serviceBadgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.serviceLabel, item.labelColor ? { color: item.labelColor } : null]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function PromoCard({ item, width }) {
  return (
    <Pressable
      onPress={() => router.push('/(customer)/promotions')}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <LinearGradient
        colors={item.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.promoCard, { width }]}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={92}
          color="rgba(255,255,255,0.13)"
          style={styles.promoWatermark}
        />
        <View style={styles.promoTag}>
          <Text style={styles.promoTagText}>{item.tag}</Text>
        </View>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoCation}>{item.caption}</Text>
        <Text style={styles.promoValue}>{item.value}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function CustomerDashboard() {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const promoWidth = useMemo(() => Math.min(width * 0.68, 280), [width]);

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
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerCircleOne} />
          <View style={styles.headerCircleTwo} />

          <View style={styles.topRow}>
            <View style={styles.logoPill}>
              <MaterialCommunityIcons name="paw" size={24} color="#1D4ED8" />
            </View>

            <View style={styles.headerRight}>
              <Pressable style={styles.phonePill}>
                <MaterialCommunityIcons name="phone" size={15} color={COLORS.yellow} />
                <Text style={styles.phoneText}>0898 520 760</Text>
              </Pressable>

              <Pressable style={styles.bellButton} onPress={() => router.push('/(customer)/notifications')}>
                <MaterialCommunityIcons name="bell-outline" size={21} color="#FFFFFF" />
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>12</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={21} color="rgba(255,255,255,0.85)" />
              <TextInput
                placeholder="Spa tắm, cắt tỉa, bác sĩ thú y..."
                placeholderTextColor="rgba(255,255,255,0.72)"
                style={styles.searchInput}
              />
            </View>

            <Pressable style={styles.rewardPill} onPress={() => router.push('/(customer)/loyalty')}>
              <MaterialCommunityIcons name="star-circle" size={18} color="#7A4A00" />
              <Text style={styles.rewardText}>450 Xu</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#7A4A00" />
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.walletRow}>
          <Pressable style={styles.petPayCard} onPress={() => router.push('/(customer)/invoices')}>
            <MaterialCommunityIcons
              name="paw"
              size={82}
              color={COLORS.blue}
              style={styles.petPayWatermark}
            />
            <View style={styles.petPayTop}>
              <View style={styles.petPayBadge}>
                <MaterialCommunityIcons name="wallet" size={17} color="#FFFFFF" />
              </View>
              <Text style={styles.petPayTitle}>PetPay</Text>
              <MaterialCommunityIcons
                name="eye-outline"
                size={18}
                color="#B3B9C9"
                style={{ marginLeft: 'auto' }}
              />
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balance}>1.250.000</Text>
              <Text style={styles.balanceUnit}>đ</Text>
            </View>
            <View style={styles.petPayDivider} />
            <View style={styles.petPayFooter}>
              <Text style={styles.petPayFooterText}>Chăm Boss tiện lợi</Text>
              <MaterialCommunityIcons name="paw-outline" size={15} color={COLORS.blue} />
            </View>
          </Pressable>

          <View style={styles.rightCards}>
            <Pressable style={styles.smallCard} onPress={() => router.push('/(customer)/loyalty')}>
              <View style={[styles.smallIcon, { backgroundColor: '#FFF1E6' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={19} color="#F97316" />
              </View>
              <View style={styles.smallBody}>
                <View style={styles.smallTitleRow}>
                  <Text style={styles.smallTitle}>PetCare Later</Text>
                  <View style={styles.interestBadge}>
                    <Text style={styles.interestText}>0% Lãi</Text>
                  </View>
                </View>
                <Text style={styles.smallSub}>Đăng ký hạn mức</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={17} color="#C3C8D4" />
            </Pressable>

            <Pressable style={styles.smallCard} onPress={() => router.push('/(customer)/loyalty')}>
              <View style={[styles.smallIcon, { backgroundColor: '#FFF7DB' }]}>
                <MaterialCommunityIcons name="crown" size={19} color="#E6A800" />
              </View>
              <View style={styles.smallBody}>
                <View style={styles.smallTitleRow}>
                  <Text style={styles.smallTitle}>Gói Hội Viên VIP</Text>
                  <View style={styles.vipBadge}>
                    <Text style={styles.vipText}>-30%</Text>
                  </View>
                </View>
                <Text style={styles.smallSub}>Đặc quyền boss cưng</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={17} color="#C3C8D4" />
            </Pressable>
          </View>
        </View>

        <View style={styles.quickCard}>
          {quickActions.map((item) => (
            <QuickAction key={item.label} item={item} />
          ))}
        </View>

        <View style={styles.serviceCard}>
          {services.map((item) => (
            <ServiceItem key={item.label} item={item} />
          ))}
        </View>

        <View style={styles.healthCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.titleBar} />
              <Text style={styles.sectionTitle}>DỊCH VỤ SỨC KHỎE & Y TẾ BOSS</Text>
            </View>
            <Pressable onPress={() => router.push('/(customer)/booking')}>
              <Text style={styles.seeAll}>Tất cả &gt;</Text>
            </Pressable>
          </View>
          <View style={styles.healthGrid}>
            {healthServices.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push('/(customer)/booking')}
                style={({ pressed }) => [styles.healthItem, pressed && styles.pressed]}
              >
                <View style={[styles.healthIcon, { backgroundColor: item.bg }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.healthLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.promoSection}>
          <View style={styles.promoHeader}>
            <View style={styles.promoHeaderLeft}>
              <MaterialCommunityIcons name="fire" size={19} color="#F97316" />
              <Text style={styles.promoHeading}>ƯU ĐÃI ĐÌNH HÔM NAY</Text>
            </View>
            <Text style={styles.promoUpdated}>Cập nhật mỗi ngày</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoList}
          >
            {promos.map((item) => (
              <PromoCard key={item.title} item={item} width={promoWidth} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.commitment}>
          <View style={styles.commitmentIcon}>
            <MaterialCommunityIcons name="shield-check-outline" size={27} color="#93B4FF" />
          </View>
          <View style={styles.commitmentBody}>
            <Text style={styles.commitmentTitle}>Pet Service HCM Cam Kết</Text>
            <Text style={styles.commitmentText}>Bác sĩ chuyên khoa • Tận tâm phục vụ tận nhà</Text>
          </View>
          <Pressable
            style={styles.callButton}
            onPress={() => router.push('/(customer)/booking')}
          >
            <MaterialCommunityIcons name="phone" size={17} color={COLORS.navy} />
            <Text style={styles.callButtonText}>Gọi ngay</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  pressed: {
    opacity: 0.72,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 42,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  headerCircleOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -50,
  },
  headerCircleTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -60,
    left: -20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoPill: {
    width: 52,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06143D',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  phoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -3,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: '#2B4BE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 16,
  },
  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.17)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  rewardPill: {
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#7A4A00',
    fontSize: 13,
    fontWeight: '800',
  },
  walletRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -28,
  },
  petPayCard: {
    flex: 1.05,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    minHeight: 148,
    overflow: 'hidden',
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  petPayWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -8,
    opacity: 0.055,
  },
  petPayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  petPayBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petPayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  balance: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  balanceUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 3,
    textDecorationLine: 'underline',
  },
  petPayDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 13,
  },
  petPayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  petPayFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
  },
  rightCards: {
    flex: 0.95,
    gap: 10,
  },
  smallCard: {
    flex: 1,
    minHeight: 69,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBody: {
    flex: 1,
    minWidth: 0,
  },
  smallTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallTitle: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.text,
  },
  interestBadge: {
    backgroundColor: '#FFE4E6',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  interestText: {
    color: '#E11D48',
    fontSize: 8,
    fontWeight: '800',
  },
  vipBadge: {
    backgroundColor: '#FFF1C2',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  vipText: {
    color: '#B77900',
    fontSize: 8,
    fontWeight: '800',
  },
  smallSub: {
    fontSize: 9.5,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  quickCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  quickItem: {
    width: '25%',
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  quickLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  serviceCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 8,
    paddingTop: 18,
    paddingBottom: 4,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  serviceItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBadge: {
    position: 'absolute',
    top: -7,
    right: -6,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  serviceBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  serviceLabel: {
    marginTop: 7,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 15,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  titleBar: {
    width: 4,
    height: 17,
    borderRadius: 2,
    backgroundColor: COLORS.blue,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  seeAll: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.blue,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthItem: {
    width: '24%',
    alignItems: 'center',
    gap: 7,
  },
  healthIcon: {
    width: 49,
    height: 49,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  promoSection: {
    marginTop: 20,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 11,
  },
  promoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  promoHeading: {
    fontSize: 12.5,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  promoUpdated: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.muted,
  },
  promoList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  promoCard: {
    height: 143,
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
  },
  promoWatermark: {
    position: 'absolute',
    right: -12,
    bottom: -18,
  },
  promoTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  promoCation: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 11,
  },
  promoValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 1,
    letterSpacing: -0.4,
  },
  commitment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 18,
    padding: 13,
    shadowColor: '#0B1B4D',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  commitmentIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: 'rgba(147,180,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commitmentBody: {
    flex: 1,
  },
  commitmentTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  commitmentText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 9.5,
    marginTop: 3,
    lineHeight: 14,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  callButtonText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: '800',
  },
});
