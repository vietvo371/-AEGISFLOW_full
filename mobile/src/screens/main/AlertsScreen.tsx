import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme, FONT_SIZE, SPACING, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
import { alertService, AlertItem } from '../../services/alertService';

const SEVERITY_CONFIG = (t: (key: string) => string): Record<string, { label: string; color: string; borderColor: string }> => ({
  critical: { label: t('citizen.alerts.critical'), color: '#EF4444', borderColor: '#EF4444' },
  high: { label: t('citizen.alerts.high'), color: '#F97316', borderColor: '#F97316' },
  medium: { label: t('citizen.alerts.medium'), color: '#EAB308', borderColor: '#EAB308' },
  low: { label: t('citizen.alerts.low'), color: '#3B82F6', borderColor: '#3B82F6' },
});

const AlertsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const FILTERS = [
    { key: 'all', label: t('citizen.alerts.all') },
    { key: 'critical', label: t('citizen.alerts.critical') },
    { key: 'high', label: t('citizen.alerts.high') },
    { key: 'medium', label: t('citizen.alerts.medium') },
  ] as const;

  const severityConfig = SEVERITY_CONFIG(t);

  const fetchAlerts = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const res = await alertService.getAlerts({ page: pageNum, per_page: 20 });
      const items = res.data?.data || res.data || [];

      if (refresh || pageNum === 1) {
        setAlerts(items);
      } else {
        setAlerts(prev => [...prev, ...items]);
      }
      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const onRefresh = () => fetchAlerts(1, true);
  const onEndReached = () => { if (hasMore && !loading) fetchAlerts(page + 1); };

  const filteredAlerts = activeFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === activeFilter);

  const renderAlert = ({ item }: { item: AlertItem }) => {
    const severity = severityConfig[item.severity] || severityConfig.medium;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: severity.borderColor }]}
        onPress={() => navigation.navigate('AlertDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.severityBadge, { backgroundColor: severity.color + '15', borderColor: severity.color + '30', borderWidth: 1 }]}>
              <Text style={[styles.severityText, { color: severity.color }]}>
                {severity.label}
              </Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.timeRow}>
              <Icon name="clock-outline" size={13} color="#9CA3AF" />
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('citizen.alerts.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('citizen.alerts.subtitle')}</Text>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && alerts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlert}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="bell-check-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t('citizen.alerts.noAlerts')}</Text>
              <Text style={styles.emptySubtext}>{t('citizen.alerts.allClear')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

function getTimeAgo(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} ${t('common.time.minutesAgo', { count: minutes })}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${t('common.time.hoursAgo', { count: hours })}`;
  return `${Math.floor(hours / 24)} ${t('common.time.daysAgo', { count: Math.floor(hours / 24) })}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },

  // Header
  header: {
    backgroundColor: theme.colors.white, paddingHorizontal: SCREEN_PADDING.horizontal, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: { fontSize: FONT_SIZE['3xl'], fontWeight: '800', color: theme.colors.text },
  headerSubtitle: { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary, marginTop: SPACING.xs },

  // Filters
  filterRow: { flexDirection: 'row', marginTop: SPACING.lg, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.xl,
    backgroundColor: theme.colors.backgroundTertiary, borderWidth: 1, borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.text, borderColor: theme.colors.text,
  },
  filterText: { fontSize: FONT_SIZE.xs, fontWeight: '500', color: theme.colors.textSecondary },
  filterTextActive: { color: theme.colors.textWhite, fontWeight: '600' },

  // List
  list: { padding: SPACING.lg, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: theme.colors.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    borderLeftWidth: 4, marginBottom: SPACING.md,
    ...theme.shadows.sm,
  },
  cardBody: {},
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: theme.colors.text, flex: 1 },
  severityBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm },
  severityText: { fontSize: FONT_SIZE['2xs'], fontWeight: '700' },
  cardDesc: { fontSize: FONT_SIZE.xs, color: theme.colors.textSecondary, marginTop: SPACING.sm, lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  timeText: { fontSize: FONT_SIZE.xs, color: theme.colors.textTertiary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm,
    backgroundColor: theme.colors.successLight, borderWidth: 1, borderColor: '#BBF7D0',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success },
  statusText: { fontSize: FONT_SIZE['2xs'], fontWeight: '600', color: '#16A34A' },

  // Empty & Center
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING['4xl'] },
  emptyText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: theme.colors.text, marginTop: SPACING.lg },
  emptySubtext: { fontSize: FONT_SIZE.xs, color: theme.colors.textTertiary, marginTop: SPACING.xs },
  loadingText: { fontSize: FONT_SIZE.sm, color: theme.colors.textSecondary, marginTop: SPACING.md },
});

export default AlertsScreen;
