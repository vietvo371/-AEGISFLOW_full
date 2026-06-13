import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme, FONT_SIZE, SPACING, BORDER_RADIUS, SCREEN_PADDING, hp } from '../../theme';
import { alertService, AlertItem } from '../../services/alertService';

const SEVERITY_CONFIG = (t: (key: string) => string): Record<string, { label: string; color: string; borderColor: string; bg: string }> => ({
  critical: { label: t('citizen.alerts.critical'), color: '#F04438', borderColor: '#F04438', bg: '#FEE2E2' },
  high: { label: t('citizen.alerts.high'), color: '#F79009', borderColor: '#F79009', bg: '#FEF3C7' },
  medium: { label: t('citizen.alerts.medium'), color: '#EAB308', borderColor: '#EAB308', bg: '#FEFCE8' },
  low: { label: t('citizen.alerts.low'), color: '#3B82F6', borderColor: '#3B82F6', bg: '#EFF6FF' },
});

const AlertsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Pulsing animation for the Live indicator
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const FILTERS = [
    { key: 'all', label: t('citizen.alerts.all') },
    { key: 'critical', label: t('citizen.alerts.critical') },
    { key: 'high', label: t('citizen.alerts.high') },
    { key: 'medium', label: t('citizen.alerts.medium') },
    { key: 'low', label: t('citizen.alerts.low') },
  ] as const;

  const severityConfig = SEVERITY_CONFIG(t);

  const fetchAlerts = useCallback(async (pageNum: number = 1, refresh: boolean = false, isFilterChange: boolean = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1 || isFilterChange) setLoading(true);

      const queryParams = {
        page: pageNum,
        per_page: 20,
        severity: activeFilter === 'all' ? undefined : activeFilter,
      };

      const res = await alertService.getAlerts(queryParams);
      const items = res.data?.data || res.data || [];

      if (refresh || pageNum === 1 || isFilterChange) {
        setAlerts(items);
      } else {
        setAlerts(prev => [...prev, ...items]);
      }
      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch (err) {
      console.log('Error fetching alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  // Load data when activeFilter changes
  useEffect(() => {
    fetchAlerts(1, false, true);
  }, [activeFilter, fetchAlerts]);

  const onRefresh = () => fetchAlerts(1, true);
  const onEndReached = () => { if (hasMore && !loading && !refreshing) fetchAlerts(page + 1); };

  const renderAlert = ({ item }: { item: AlertItem }) => {
    const severity = severityConfig[item.severity] || severityConfig.medium;
    const isCritical = item.severity === 'critical' || item.severity === 'high';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderLeftColor: severity.borderColor },
          isCritical && styles.cardCritical
        ]}
        onPress={() => navigation.navigate('AlertDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.titleContainer}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.source && (
                <Text style={styles.sourceText}>Nguồn: {item.source === 'operator' ? 'Ban Chỉ huy' : item.source}</Text>
              )}
            </View>
            <View style={[styles.severityBadge, { backgroundColor: severity.color + '12', borderColor: severity.color + '25', borderWidth: 1 }]}>
              <Text style={[styles.severityText, { color: severity.color }]}>
                {severity.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.timeRow}>
              <Icon name="clock-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={styles.timeText}>
                {item.created_at ? getTimeAgo(item.created_at, t) : ''}
              </Text>
            </View>
            {item.status === 'active' && (
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t('citizen.alerts.active')}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 55) + 10 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ marginRight: 12, padding: 4 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('citizen.alerts.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('citizen.alerts.subtitle')}</Text>
          </View>
          {/* Real-time pulse indicator */}
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Scrollable Filter Chips */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollView}
          >
            {FILTERS.map(f => {
              const isSelected = activeFilter === f.key;
              const severity = severityConfig[f.key];
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                    isSelected && f.key !== 'all' && { borderColor: severity?.color, backgroundColor: severity?.color }
                  ]}
                  onPress={() => setActiveFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.filterText,
                    isSelected && styles.filterTextActive
                  ]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {loading && alerts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, alerts.length === 0 && { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconOutline}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="bell-check" size={44} color="#17b26a" />
                </View>
              </View>
              <Text style={styles.emptyText}>{t('citizen.alerts.noAlerts')}</Text>
              <Text style={styles.emptySubtext}>
                {activeFilter === 'all'
                  ? t('citizen.alerts.allClearMessage') || 'Khu vực của bạn hiện tại an toàn, không có cảnh báo ngập lụt nào đang hoạt động.'
                  : `Không có cảnh báo mức độ ${t(`citizen.alerts.${activeFilter}`).toLowerCase()} nào trong khu vực.`}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.8}>
                <Icon name="refresh" size={16} color="#17b26a" />
                <Text style={styles.refreshButtonText}>{t('common.refresh')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    backgroundColor: theme.colors.white,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    ...theme.shadows.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING.horizontal,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // Live Pulse Indicator
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 68, 56, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F04438',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F04438',
    letterSpacing: 0.5,
  },

  // Filters ScrollView
  filterWrapper: {
    marginTop: SPACING.xs,
  },
  filterScrollView: {
    paddingHorizontal: SCREEN_PADDING.horizontal,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm - 1,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
    ...theme.shadows.xs,
  },
  filterText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: theme.colors.textWhite,
    fontWeight: '700',
  },

  // List
  list: { padding: SPACING.lg, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    marginBottom: SPACING.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  cardCritical: {
    backgroundColor: '#FFFDFD',
    borderColor: 'rgba(240, 68, 56, 0.1)',
  },
  cardBody: {},
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sourceText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  severityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textTertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: theme.colors.successLight,
    borderWidth: 1,
    borderColor: 'rgba(23, 178, 106, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.success,
  },

  // Empty State in Card
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: hp('10%'),
  },
  emptyIconOutline: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(23, 178, 106, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(23, 178, 106, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(23, 178, 106, 0.12)',
  },
  emptyText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 178, 106, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  refreshButtonText: {
    color: '#17b26a',
    fontSize: 14,
    fontWeight: '600',
  },

  // Center & Loading
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['4xl'],
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: theme.colors.textSecondary,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});

export default AlertsScreen;

