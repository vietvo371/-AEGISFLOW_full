import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { alertService, AlertItem } from '../../services/alertService';

const SEVERITY_CONFIG: Record<string, { color: string; icon: string }> = {
  critical: { color: '#EF4444', icon: 'alert-octagon' },
  high: { color: '#F97316', icon: 'alert' },
  medium: { color: '#EAB308', icon: 'alert-circle-outline' },
  low: { color: '#3B82F6', icon: 'information-outline' },
};

const ALERT_TYPE_ICON: Record<string, string> = {
  flood_warning: 'waves',
  heavy_rain: 'weather-pouring',
  dam_warning: 'wall',
  weather: 'weather-lightning',
  prediction: 'chart-line',
  warning: 'alert-circle',
  critical: 'alert-octagon',
};

const AlertsScreen = () => {
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  const renderAlert = ({ item }: { item: AlertItem }) => {
    const severity = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.low;
    const typeIcon = ALERT_TYPE_ICON[item.alert_type] || 'alert-circle';

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: severity.color }]}
        onPress={() => navigation.navigate('AlertDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: severity.color + '15' }]}>
          <Icon name={typeIcon} size={24} color={severity.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.severityBadge, { backgroundColor: severity.color + '20' }]}>
              <Text style={[styles.severityText, { color: severity.color }]}>
                {item.severity_label || item.severity}
              </Text>
            </View>
          </View>
          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={styles.cardFooter}>
            <Icon name="clock-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.timeText}>
              {item.effective_from ? new Date(item.effective_from).toLocaleDateString('vi-VN') : ''}
            </Text>
            {item.status && (
              <View style={[styles.statusBadge, item.status === 'active' && styles.statusActive]}>
                <Text style={[styles.statusText, item.status === 'active' && styles.statusActiveText]}>
                  {item.status_label || item.status}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && alerts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cảnh báo</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cảnh báo</Text>
        <Text style={styles.headerSubtitle}>Cập nhật tình hình ngập lụt & thời tiết</Text>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.center}>
            <Icon name="bell-check-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>Không có cảnh báo nào</Text>
            <Text style={styles.emptySubtext}>Khu vực của bạn hiện tại an toàn</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.colors.white },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text, flex: 1, marginRight: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  severityText: { fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  timeText: { fontSize: 12, color: theme.colors.textSecondary },
  statusBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#F3F4F6' },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusText: { fontSize: 11, color: theme.colors.textSecondary },
  statusActiveText: { color: '#16A34A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
});

export default AlertsScreen;
