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
import { theme, FONT_SIZE, SPACING, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
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
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

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
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const criticalAlert = activeAlerts.find(a => a.severity === 'critical' || a.severity === 'high');

  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if ('tab' in action) navigation.navigate(action.tab as any);
  };

  const firstName = user?.name?.split(' ').pop() || 'Cư dân';
  const today = new Date();
  const dateStr = today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const temp = weather?.current?.temperature || 28;
  const humidity = weather?.current?.humidity || 82;
  const rainfall = weather?.current?.rainfall || 15;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Violet Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDate}>{dateStr}</Text>
              <Text style={styles.headerGreeting}>{t('citizen.dashboard.greeting', firstName)}</Text>
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
              <Text style={styles.weatherTemp}>{temp}°</Text>
              <Text style={styles.weatherDesc}>{t('citizen.dashboard.weather')}</Text>
            </View>
          </View>
          <View style={styles.weatherMeta}>
            <View style={styles.weatherMetaItem}>
              <Icon name="water-percent" size={14} color="#3B82F6" />
              <Text style={styles.weatherMetaText}>{humidity}%</Text>
              <Text style={styles.weatherMetaLabel}>{t('citizen.dashboard.humidity')}</Text>
            </View>
            <View style={styles.weatherMetaItem}>
              <Icon name="weather-pouring" size={14} color="#3B82F6" />
              <Text style={styles.weatherMetaText}>{rainfall}mm/h</Text>
              <Text style={styles.weatherMetaLabel}>{t('citizen.dashboard.rainfall')}</Text>
            </View>
            <View style={styles.weatherMetaItem}>
              <Icon name="weather-windy" size={14} color="#3B82F6" />
              <Text style={styles.weatherMetaText}>12km/h</Text>
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
            <Text style={styles.metricValue}>{rainfall}mm</Text>
            <Text style={styles.metricLabel}>{t('citizen.dashboard.rainfall').toUpperCase()}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>1.2m</Text>
            <Text style={styles.metricLabel}>{t('flood.waterLevel').toUpperCase()}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>85%</Text>
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
                <Text style={styles.riskGridValue}>{rainfall}mm/h</Text>
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
            activeOpacity={0.85}
          >
            <View style={styles.alertBannerIcon}>
              <Icon name="alert" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertBannerTitle} numberOfLines={2}>
                {criticalAlert.title || t('citizen.alerts.critical')}
              </Text>
              <Text style={styles.alertBannerDesc} numberOfLines={1}>
                {criticalAlert.description || ''}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color="rgba(255,255,255,0.7)" />
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
                activeOpacity={0.7}
              >
                <View style={styles.alertCardLeft}>
                  <View style={[styles.alertIconCircle, { backgroundColor: sev.color + '15' }]}>
                    <Icon name="waves" size={18} color={sev.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertCardTitle} numberOfLines={1}>{alert.title}</Text>
                    <View style={styles.alertCardMeta}>
                      <Icon name="clock-outline" size={12} color={theme.colors.textTertiary} />
                      <Text style={styles.alertCardTime}>
                        {alert.created_at ? getTimeAgo(alert.created_at, t) : ''}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.severityBadgeText, { color: sev.color }]}>{t(`citizen.alerts.${sev.labelKey}`).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

function getTimeAgo(dateStr: string, t: (key: string, fallback?: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} ${t('citizen.alerts.minutesAgo').replace('{{count}}', String(minutes)).split(' ')[0]} trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
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

  // Alert Banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.error, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.xl, gap: SPACING.md,
    ...theme.shadows.md,
  },
  alertBannerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  alertBannerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.textWhite },
  alertBannerDesc: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  alertCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md },
  alertIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  alertCardTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: theme.colors.text, marginBottom: 3 },
  alertCardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  alertCardTime: { fontSize: FONT_SIZE.xs, color: theme.colors.textTertiary },
  severityBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.xs },
  severityBadgeText: { fontSize: FONT_SIZE['2xs'], fontWeight: '700' },

  // Empty
  emptyCard: {
    alignItems: 'center', padding: SPACING['3xl'],
    backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg,
  },
  emptyText: { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary, marginTop: SPACING.sm },
});

export default HomeScreen;
