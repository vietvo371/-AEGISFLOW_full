import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, CitizenTabParamList } from '../../navigation/types';
import { theme, SPACING, ICON_SIZE, wp } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { alertService, AlertItem } from '../../services/alertService';
import { weatherService, WeatherSummary } from '../../services/weatherService';
import { reportService } from '../../services/reportService';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const QUICK_ACTIONS = [
  { id: 'report', label: 'Báo cáo ngập', icon: 'file-document-edit-outline', color: '#3B82F6', screen: 'CreateReport' },
  { id: 'rescue', label: 'Yêu cầu cứu hộ', icon: 'lifebuoy', color: '#EF4444', screen: 'RescueRequest' },
  { id: 'shelter', label: 'Nơi trú ẩn', icon: 'home-roof', color: '#22C55E', screen: 'ShelterList' },
  { id: 'map', label: 'Bản đồ ngập', icon: 'map-marker-radius', color: '#8B5CF6', tab: 'Map' },
] as const;

const HomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [alertRes, incidentRes] = await Promise.allSettled([
        alertService.getActiveAlerts(),
        reportService.getReports({ per_page: 5 } as any),
      ]);

      if (alertRes.status === 'fulfilled') {
        const items = alertRes.value.data?.data || alertRes.value.data || [];
        setActiveAlerts(Array.isArray(items) ? items : []);
      }
      if (incidentRes.status === 'fulfilled') {
        const items = incidentRes.value.data?.data || incidentRes.value.data || [];
        setRecentIncidents(Array.isArray(items) ? items.slice(0, 5) : []);
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

  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if ('tab' in action) {
      navigation.navigate(action.tab as any);
    } else if ('screen' in action) {
      navigation.navigate(action.screen as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.headerGreeting}>
              Xin chào, {user?.name?.split(' ').pop() || 'Cư dân'}
            </Text>
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

        {weather?.current && (
          <View style={styles.weatherRow}>
            <Icon
              name={weather.current.condition === 'Rain' ? 'weather-pouring' : 'weather-partly-cloudy'}
              size={18} color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.weatherText}>{weather.current.temperature}°C</Text>
            {weather.current.humidity > 0 && (
              <Text style={styles.weatherText}>  {weather.current.humidity}% ẩm</Text>
            )}
            {weather.current.rainfall > 0 && (
              <Text style={styles.weatherTextRain}>  {weather.current.rainfall}mm mưa</Text>
            )}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Critical Alert Banner */}
        {criticalAlerts.length > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => navigation.navigate('AlertDetail' as any, { id: criticalAlerts[0].id })}
            activeOpacity={0.8}
          >
            <View style={styles.alertBannerIcon}>
              <Icon name="alert-octagon" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertBannerTitle}>
                {criticalAlerts.length > 1
                  ? `${criticalAlerts.length} cảnh báo khẩn cấp`
                  : criticalAlerts[0].title}
              </Text>
              {criticalAlerts[0].description && (
                <Text style={styles.alertBannerDesc} numberOfLines={2}>
                  {criticalAlerts[0].description}
                </Text>
              )}
            </View>
            <Icon name="chevron-right" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Hành động nhanh</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickCard}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '15' }]}>
                <Icon name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Alerts Summary */}
        {activeAlerts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cảnh báo đang hoạt động</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Alerts' as any)}>
                <Text style={styles.seeAll}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            {activeAlerts.slice(0, 3).map(alert => {
              const severityColor =
                alert.severity === 'critical' ? '#EF4444'
                : alert.severity === 'high' ? '#F97316'
                : alert.severity === 'medium' ? '#EAB308'
                : '#3B82F6';
              return (
                <TouchableOpacity
                  key={alert.id}
                  style={[styles.alertCard, { borderLeftColor: severityColor }]}
                  onPress={() => navigation.navigate('AlertDetail' as any, { id: alert.id })}
                >
                  <Icon name="alert-circle" size={20} color={severityColor} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.alertCardTitle} numberOfLines={1}>{alert.title}</Text>
                    <Text style={styles.alertCardTime}>
                      {alert.created_at ? new Date(alert.created_at).toLocaleDateString('vi-VN') : ''}
                    </Text>
                  </View>
                  <View style={[styles.severityChip, { backgroundColor: severityColor + '15' }]}>
                    <Text style={[styles.severityChipText, { color: severityColor }]}>
                      {alert.severity_label || alert.severity}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Recent Incidents */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sự cố gần đây</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Alerts' as any)}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {loading && recentIncidents.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
        ) : recentIncidents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="check-circle-outline" size={40} color="#22C55E" />
            <Text style={styles.emptyText}>Không có sự cố nào gần đây</Text>
          </View>
        ) : (
          recentIncidents.map(incident => (
            <TouchableOpacity
              key={incident.id}
              style={styles.incidentCard}
              onPress={() => navigation.navigate('IncidentDetail', { id: incident.id })}
            >
              <View style={styles.incidentHeader}>
                <Text style={styles.incidentTitle} numberOfLines={1}>{incident.title}</Text>
                <View style={[
                  styles.incidentSeverity,
                  { backgroundColor: incident.severity === 'critical' ? '#FEF2F2' : '#F3F4F6' },
                ]}>
                  <Text style={[
                    styles.incidentSeverityText,
                    { color: incident.severity === 'critical' ? '#EF4444' : theme.colors.textSecondary },
                  ]}>
                    {incident.severity_label || incident.severity}
                  </Text>
                </View>
              </View>
              {incident.address && (
                <View style={styles.incidentRow}>
                  <Icon name="map-marker-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.incidentMeta} numberOfLines={1}>{incident.address}</Text>
                </View>
              )}
              <View style={styles.incidentRow}>
                <Icon name="clock-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.incidentMeta}>
                  {incident.created_at ? new Date(incident.created_at).toLocaleDateString('vi-VN') : ''}
                </Text>
                <View style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      incident.status === 'resolved' ? '#22C55E'
                      : incident.status === 'responding' ? '#F97316'
                      : '#3B82F6',
                  },
                ]} />
                <Text style={styles.incidentMeta}>{incident.status_label || incident.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* My Reports shortcut */}
        <TouchableOpacity
          style={styles.myReportsBtn}
          onPress={() => navigation.navigate('MyReports')}
        >
          <Icon name="file-document-multiple-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.myReportsBtnText}>Xem báo cáo của tôi</Text>
          <Icon name="chevron-right" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.myReportsBtn}
          onPress={() => navigation.navigate('MyRescueRequests' as any)}
        >
          <Icon name="lifebuoy" size={20} color='#EF4444' />
          <Text style={[styles.myReportsBtnText, { color: '#EF4444' }]}>Yêu cầu cứu hộ của tôi</Text>
          <Icon name="chevron-right" size={20} color='#EF4444' />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.primary, paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 16,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerGreeting: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 2 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  weatherText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  weatherTextRain: { fontSize: 13, color: '#FCA5A5', fontWeight: '500' },

  scroll: { padding: 16 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444',
    borderRadius: 14, padding: 14, marginBottom: 16, gap: 12,
  },
  alertBannerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  alertBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  alertBannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    width: (wp(100) - 44) / 2, alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 18, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  quickIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 3,
  },
  alertCardTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.text },
  alertCardTime: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  severityChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  severityChipText: { fontSize: 11, fontWeight: '600' },

  incidentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incidentTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, flex: 1, marginRight: 8 },
  incidentSeverity: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  incidentSeverityText: { fontSize: 11, fontWeight: '500' },
  incidentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  incidentMeta: { fontSize: 12, color: theme.colors.textSecondary },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 8 },

  emptyCard: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderRadius: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },

  myReportsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  myReportsBtnText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.primary },
});

export default HomeScreen;
