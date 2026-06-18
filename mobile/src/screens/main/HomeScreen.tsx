import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, CitizenTabParamList } from '../../navigation/types';
import { theme, FONT_SIZE, SPACING, BORDER_RADIUS, SCREEN_PADDING } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { alertService, AlertItem } from '../../services/alertService';
import { weatherService, WeatherSummary } from '../../services/weatherService';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const QUICK_ACTIONS = [
  { id: 'report', icon: 'file-document-edit-outline', color: '#3B82F6', bg: '#EFF6FF', tab: 'Map', labelKey: 'reportFlood' },
  { id: 'rescue', icon: 'lifebuoy', color: '#EF4444', bg: '#FEF2F2', tab: 'SOS', labelKey: 'rescue' },
  { id: 'shelter', icon: 'home-roof', color: '#22C55E', bg: '#F0FDF4', tab: 'Shelters', labelKey: 'shelters' },
  { id: 'map', icon: 'map-marker-radius', color: '#7a5af8', bg: '#F5F3FF', tab: 'Map', labelKey: 'viewMap' },
] as const;

const SEVERITY_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
  critical: { labelKey: 'critical', color: '#ef4444', bg: '#FEF2F2' },
  high: { labelKey: 'high', color: '#F97316', bg: '#FFF7ED' },
  medium: { labelKey: 'medium', color: '#EAB308', bg: '#FEFCE8' },
  low: { labelKey: 'low', color: '#3B82F6', bg: '#EFF6FF' },
};

const HomeScreen = () => {
  const { t, i18n } = useTranslation();

  const SAFETY_TIPS = [
    { id: '1', title: t('citizen.weather.tips.beforeFlood', 'Trước khi ngập'), desc: t('citizen.weather.tips.beforeFloodDesc', 'Di dời đồ đạc lên cao, ngắt cầu dao điện.'), icon: 'home-alert', color: '#F59E0B', bg: '#FEF3C7' },
    { id: '2', title: t('citizen.weather.tips.duringFlood', 'Khi đang ngập'), desc: t('citizen.weather.tips.duringFloodDesc', 'Tuyệt đối không lội qua vùng nước chảy xiết.'), icon: 'waves', color: '#3B82F6', bg: '#EFF6FF' },
    { id: '3', title: t('citizen.weather.tips.afterFlood', 'Sau khi ngập'), desc: t('citizen.weather.tips.afterFloodDesc', 'Kiểm tra rò rỉ điện trước khi đóng cầu dao.'), icon: 'flash-alert', color: '#EF4444', bg: '#FEF2F2' },
    { id: '4', title: t('citizen.weather.tips.firstAidKit', 'Túi sơ cứu'), desc: t('citizen.weather.tips.firstAidKitDesc', 'Sắp xếp sẵn thuốc men, đèn pin, nước sạch.'), icon: 'medical-bag', color: '#10B981', bg: '#D1FAE5' },
  ];
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { unreadCount, registerRefreshCallback } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [alertRes] = await Promise.allSettled([
        alertService.getActiveAlerts(),
      ]);
      if (alertRes.status === 'fulfilled') {
        const items = alertRes.value.data?.data || alertRes.value.data || [];
        setActiveAlerts(Array.isArray(items) ? items : []);
      }
      try {
        const w = await weatherService.getSummary();
        setWeather(w);
      } catch { /* */ }
    } catch { /* */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const unsubscribe = registerRefreshCallback(() => {
      console.log('🔄 [HomeScreen] Real-time refresh triggered!');
      fetchData();
    });
    return unsubscribe;
  }, [registerRefreshCallback, fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const criticalAlert = activeAlerts.find(a => a.severity === 'critical' || a.severity === 'high');

  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if ('tab' in action) navigation.navigate(action.tab as any);
  };

  const firstName = user?.name?.split(' ').pop() || t('profile.role.citizen');
  const today = new Date();
  const dateStr = today.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const temp = weather?.current?.temperature;
  const humidity = weather?.current?.humidity;
  const rainfall = weather?.current?.rainfall;
  const windSpeed = weather?.current?.wind_speed;
  const displayTemp = temp != null ? `${Math.round(temp)}°` : '--';
  const displayHumidity = humidity != null ? `${Math.round(humidity)}%` : '--';
  const displayRainfall = rainfall != null ? `${rainfall}mm` : '--';
  const displayWindSpeed = windSpeed != null ? `${windSpeed}km/h` : '--';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Violet Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDate}>{dateStr}</Text>
              <Text style={styles.headerGreeting}>{t('citizen.dashboard.greeting', { name: firstName || 'Người dùng' })}</Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="bell-outline" size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* AI Status Chip */}
          <View style={styles.aiChip}>
            <View style={styles.aiDot} />
            <Text style={styles.aiChipText}>{t('citizen.dashboard.subtitle')}</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherMain}>
            <Icon name="weather-partly-cloudy" size={48} color="#F59E0B" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.weatherTemp}>{displayTemp}</Text>
              <Text style={styles.weatherDesc}>{weather?.forecast || t('citizen.dashboard.weather')}</Text>
            </View>
          </View>
          <View style={styles.weatherMeta}>
            <View style={styles.weatherMetaItem}>
              <Icon name="water-percent" size={14} color="#3B82F6" />
              <Text style={styles.weatherMetaText}>{displayHumidity}</Text>
              <Text style={styles.weatherMetaLabel}>{t('citizen.dashboard.humidity')}</Text>
            </View>
            <View style={styles.weatherMetaItem}>
              <Icon name="weather-pouring" size={14} color="#3B82F6" />
              <Text style={styles.weatherMetaText}>{displayRainfall}</Text>
              <Text style={styles.weatherMetaLabel}>{t('citizen.dashboard.rainfall')}</Text>
            </View>
            <View style={styles.weatherMetaItem}>
              <Icon name="weather-windy" size={14} color="#3B82F6" />
              <Text style={styles.weatherMetaText}>{displayWindSpeed}</Text>
              <Text style={styles.weatherMetaLabel}>{t('citizen.dashboard.wind')}</Text>
            </View>
          </View>
        </View>

        {/* AI Prediction Card (dark) */}
        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Icon name="brain" size={18} color="#fff" />
            <Text style={styles.predictionTitle}>{t('citizen.dashboard.aiPrediction')}</Text>
          </View>
          <Text style={styles.predictionSub}>{t('common.refresh')}</Text>

          <View style={styles.predictionBody}>
            <View style={{ flex: 1 }}>
              <Text style={styles.predictionRisk}>{t('citizen.dashboard.floodRisk')}</Text>
              <Text style={styles.predictionDetail}>{t('citizen.dashboard.riskAssessment')}</Text>
            </View>
            <View style={styles.predictionPercent}>
              <Text style={styles.percentValue}>78%</Text>
              <Text style={styles.percentLabel}>{t('citizen.dashboard.reliability').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* 3 Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{displayRainfall}</Text>
            <Text style={styles.metricLabel}>{t('citizen.dashboard.rainfall').toUpperCase()}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>1.2m</Text>
            <Text style={styles.metricLabel}>{t('flood.waterLevel').toUpperCase()}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{displayHumidity}</Text>
            <Text style={styles.metricLabel}>{t('citizen.dashboard.humidity').toUpperCase()}</Text>
          </View>
        </View>

        {/* Risk Assessment Card */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <View style={styles.riskHeaderLeft}>
              <Icon name="shield-alert-outline" size={20} color="#F59E0B" />
              <Text style={styles.riskTitle}>{t('citizen.dashboard.riskAssessment')}</Text>
            </View>
            <View style={styles.riskBadge}>
              <Text style={styles.riskBadgeText}>{t('citizen.alerts.medium')}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.riskBar}>
            <View style={styles.riskBarGreen} />
            <View style={styles.riskBarYellow} />
            <View style={styles.riskBarEmpty} />
          </View>

          {/* 2x2 risk metrics */}
          <View style={styles.riskGrid}>
            <View style={styles.riskGridItem}>
              <Icon name="weather-pouring" size={20} color="#3B82F6" />
              <View>
                <Text style={styles.riskGridLabel}>{t('citizen.dashboard.rainfall')}</Text>
                <Text style={styles.riskGridValue}>{displayRainfall}</Text>
              </View>
            </View>
            <View style={styles.riskGridItem}>
              <Icon name="waves" size={20} color="#F97316" />
              <View>
                <Text style={styles.riskGridLabel}>{t('flood.waterLevel')}</Text>
                <Text style={styles.riskGridValue}>0.3m</Text>
              </View>
            </View>
            <View style={styles.riskGridItem}>
              <Icon name="chart-line" size={20} color="#EF4444" />
              <View>
                <Text style={styles.riskGridLabel}>{t('flood.status.monitoring')}</Text>
                <Text style={styles.riskGridValue}>{t('flood.rising')}</Text>
              </View>
            </View>
            <View style={styles.riskGridItem}>
              <Icon name="pipe-leak" size={20} color="#22C55E" />
              <View>
                <Text style={styles.riskGridLabel}>{t('flood.safetyTips.drainage', 'Drainage')}</Text>
                <Text style={styles.riskGridValue}>{t('common.normal', 'Normal')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions - colorful */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('citizen.dashboard.quickActions')}</Text>
        </View>
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickItem}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.bg }]}>
                <Icon name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{t(`citizen.dashboard.${action.labelKey}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Critical Alert Banner */}
        {criticalAlert && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => navigation.navigate('AlertDetail' as any, { id: criticalAlert.id })}
            activeOpacity={0.9}
          >
            {/* Crimson glowing left border indicator */}
            <View style={styles.alertBannerIndicator} />
            
            <View style={styles.alertBannerBody}>
              {/* Top Meta Header inside banner */}
              <View style={styles.alertBannerHeader}>
                <View style={styles.alertBannerBadge}>
                  <Icon name="alert-decagram" size={12} color="#f04438" />
                  <Text style={styles.alertBannerBadgeText}>{t('citizen.alerts.critical', 'KHẨN CẤP').toUpperCase()}</Text>
                </View>
                <View style={styles.pulseContainer}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.pulseText}>{t('digitalTwin.live', 'THỜI GIAN THỰC')}</Text>
                </View>
              </View>

              {/* Title & Desc */}
              <Text style={styles.alertBannerTitle} numberOfLines={2}>
                {criticalAlert.title || t('citizen.alerts.critical')}
              </Text>
              
              {criticalAlert.description && (
                <Text style={styles.alertBannerDesc} numberOfLines={1}>
                  {criticalAlert.description}
                </Text>
              )}
            </View>

            <View style={styles.alertBannerArrow}>
              <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
            </View>
          </TouchableOpacity>
        )}

        {/* Active Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('citizen.dashboard.activeAlerts')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Alerts' as any)} style={styles.seeAllBtn}>
            <Text style={styles.seeAll}>{t('common.all', 'Xem tất cả')}</Text>
            <Icon name="arrow-right" size={14} color="#7a5af8" />
          </TouchableOpacity>
        </View>

        {loading && activeAlerts.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
        ) : activeAlerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="shield-check-outline" size={40} color="#22C55E" />
            <Text style={styles.emptyText}>{t('citizen.alerts.allClear', 'Khu vực an toàn')}</Text>
          </View>
        ) : (
          activeAlerts.slice(0, 4).map(alert => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
            return (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertCard}
                onPress={() => navigation.navigate('AlertDetail' as any, { id: alert.id })}
                activeOpacity={0.8}
              >
                {/* Severity vertical indicator bar */}
                <View style={[styles.alertCardIndicator, { backgroundColor: sev.color }]} />

                <View style={styles.alertCardLeft}>
                  <View style={[styles.alertIconCircle, { backgroundColor: sev.color + '12' }]}>
                    <Icon name={alert.severity === 'critical' ? 'alert' : 'waves'} size={16} color={sev.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertCardTitle} numberOfLines={1}>{alert.title}</Text>
                    <View style={styles.alertCardMeta}>
                      <Icon name="clock-outline" size={11} color={theme.colors.textSecondary} />
                      <Text style={styles.alertCardTime}>
                        {alert.created_at ? getTimeAgo(alert.created_at, t) : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={[styles.severityBadge, { backgroundColor: sev.color + '12' }]}>
                  <Text style={[styles.severityBadgeText, { color: sev.color }]}>
                    {t(`citizen.alerts.${sev.labelKey}`).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Live Radar Preview Card */}
        <TouchableOpacity 
          style={styles.radarCard}
          onPress={() => navigation.navigate('Map' as any)}
          activeOpacity={0.9}
        >
          <View style={styles.radarContent}>
            <View style={styles.radarHeader}>
              <Icon name="radar" size={20} color="#7a5af8" />
              <Text style={styles.radarTitle}>{t('citizen.dashboard.radarTitle', 'Bản đồ Radar & Cảnh báo')}</Text>
            </View>
            <Text style={styles.radarDesc}>{t('citizen.dashboard.radarDesc', 'Xem trạng thái ngập lụt cục bộ, trạm trú ẩn và lộ trình an toàn quanh khu vực của bạn theo thời gian thực.')}</Text>
            <View style={styles.radarAction}>
              <Text style={styles.radarActionText}>{t('citizen.dashboard.radarAction', 'Mở bản đồ')}</Text>
              <Icon name="arrow-right" size={16} color="#fff" />
            </View>
          </View>
          <View style={styles.radarBgDecoration}>
            <Icon name="map-marker-radius" size={120} color="rgba(122, 90, 248, 0.05)" />
          </View>
        </TouchableOpacity>

        {/* Safety Tips Carousel */}
        <View style={[styles.sectionHeader, { marginTop: SPACING.md }]}>
          <Text style={styles.sectionTitle}>{t('citizen.dashboard.safetyTipsTitle', 'Cẩm nang an toàn')}</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tipsScroll}
        >
          {SAFETY_TIPS.map(tip => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={[styles.tipIconBox, { backgroundColor: tip.bg }]}>
                <Icon name={tip.icon} size={24} color={tip.color} />
              </View>
              <Text style={styles.tipTitle} numberOfLines={1}>{tip.title}</Text>
              <Text style={styles.tipDesc} numberOfLines={2}>{tip.desc}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

function getTimeAgo(dateStr: string, t: (key: string, options?: any) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('citizen.alerts.justNow') || 'Vừa xong';
  if (minutes < 60) return t('citizen.alerts.minutesAgo', { count: minutes }) || `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('citizen.alerts.hoursAgo', { count: hours }) || `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return t('home.time.daysAgo', { count: days }) || `${days} ngày trước`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },

  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: SCREEN_PADDING.horizontal,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: BORDER_RADIUS['2xl'],
    borderBottomRightRadius: BORDER_RADIUS['2xl'],
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm,
  },
  headerDate: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  headerGreeting: { fontSize: FONT_SIZE['2xl'], fontWeight: '800', color: theme.colors.textWhite },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: theme.colors.error, borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: theme.colors.white,
  },
  badgeText: { fontSize: FONT_SIZE['2xs'], fontWeight: '700', color: theme.colors.textWhite },

  // AI Chip
  aiChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.xl, marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  aiChipText: { fontSize: FONT_SIZE.xs, color: theme.colors.textWhite, fontWeight: '500' },

  // Scroll
  scroll: { padding: SPACING.lg, paddingTop: SPACING.lg },

  // Weather Card
  weatherCard: {
    backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  weatherMain: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  weatherTemp: { fontSize: FONT_SIZE['4xl'], fontWeight: '800', color: theme.colors.text },
  weatherDesc: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary, marginTop: 2 },
  weatherMeta: { flexDirection: 'row', gap: SPACING.lg },
  weatherMetaItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  weatherMetaText: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary },
  weatherMetaLabel: { fontSize: 8, color: theme.colors.textTertiary },

  // AI Prediction Card
  predictionCard: {
    backgroundColor: theme.colors.primary, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  predictionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: theme.colors.textWhite },
  predictionSub: { fontSize: FONT_SIZE['2xs'], color: 'rgba(255,255,255,0.5)', marginTop: 2, marginBottom: SPACING.md },
  predictionBody: { flexDirection: 'row', alignItems: 'center' },
  predictionRisk: { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.textWhite, marginBottom: SPACING.xs },
  predictionDetail: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  predictionPercent: { alignItems: 'center', marginLeft: SPACING.md },
  percentValue: { fontSize: FONT_SIZE['3xl'], fontWeight: '800', color: theme.colors.secondary },
  percentLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 2 },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, justifyContent: 'space-around',
    ...theme.shadows.sm,
  },
  metricItem: { alignItems: 'center' },
  metricValue: { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.text },
  metricLabel: { fontSize: 9, color: theme.colors.textTertiary, fontWeight: '600', marginTop: 2 },

  // Risk Assessment
  riskCard: {
    backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  riskHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  riskTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: theme.colors.text },
  riskBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.md },
  riskBadgeText: { fontSize: FONT_SIZE['2xs'], fontWeight: '600', color: '#D97706' },
  riskBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.lg },
  riskBarGreen: { flex: 2, backgroundColor: theme.colors.success },
  riskBarYellow: { flex: 1, backgroundColor: theme.colors.warning },
  riskBarEmpty: { flex: 2, backgroundColor: theme.colors.border },
  riskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  riskGridItem: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: theme.colors.backgroundSecondary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
  },
  riskGridLabel: { fontSize: FONT_SIZE['2xs'], color: theme.colors.textSecondary },
  riskGridValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: theme.colors.text, marginTop: 1 },

  // Quick Actions
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg,
  },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIcon: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  quickLabel: { fontSize: FONT_SIZE['2xs'], color: theme.colors.text, textAlign: 'center', fontWeight: '500', marginTop: SPACING.xs },

  // Alert Banner (Obsidian glassmorphic style with neon details)
  alertBanner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 33, 0.96)', // Dark obsidian black
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    paddingLeft: SPACING.lg + 8, // Room for indicator
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 56, 0.18)', // Subtly glowing crimson outline
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  alertBannerIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#f04438', // Neon vibrant red
  },
  alertBannerBody: {
    flex: 1,
  },
  alertBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 56, 0.12)', // Light red capsule
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  alertBannerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF3B30', // Crimson red text
    letterSpacing: 0.5,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#17b26a', // Vibrant green status dot
  },
  pulseText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
  },
  alertBannerTitle: { 
    fontSize: FONT_SIZE.md - 1, 
    fontWeight: '700', 
    color: theme.colors.textWhite,
    lineHeight: 22,
  },
  alertBannerDesc: { 
    fontSize: FONT_SIZE.xs, 
    color: 'rgba(255, 255, 255, 0.65)', 
    marginTop: 4,
    lineHeight: 16,
  },
  alertBannerArrow: {
    marginLeft: SPACING.sm,
    justifyContent: 'center',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  seeAll: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: theme.colors.primary },

  // Alert cards
  alertCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md + 2,
    paddingLeft: SPACING.lg + 4, // Leave space for indicator bar
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    ...theme.shadows.xs,
  },
  alertCardIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  alertCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  alertIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  alertCardTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  alertCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertCardTime: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  severityBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, marginLeft: SPACING.sm },
  severityBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  // Empty
  emptyCard: {
    alignItems: 'center', padding: SPACING['3xl'],
    backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg,
  },
  emptyText: { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary, marginTop: SPACING.sm },

  // Live Radar
  radarCard: {
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6',
    ...theme.shadows.sm,
  },
  radarContent: { padding: SPACING.lg, position: 'relative', zIndex: 2 },
  radarHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  radarTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.text },
  radarDesc: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: SPACING.md, width: '85%' },
  radarAction: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: '#7a5af8', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.md,
  },
  radarActionText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: '#fff' },
  radarBgDecoration: { position: 'absolute', right: -20, bottom: -20, zIndex: 1 },

  // Tips
  tipsScroll: { gap: SPACING.md, paddingBottom: SPACING.sm },
  tipCard: {
    width: 140, backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  tipIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  tipTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  tipDesc: { fontSize: FONT_SIZE['2xs'], color: theme.colors.textSecondary, lineHeight: 14 },
});

export default HomeScreen;
