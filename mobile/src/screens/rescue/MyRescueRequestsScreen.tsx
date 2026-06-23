import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../contexts/ThemeContext';
import PageHeader from '../../component/PageHeader';
import { rescueService } from '../../services/rescueService';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  pending: { color: '#EAB308', label: 'Đang chờ', icon: 'clock-outline' },
  assigned: { color: '#3B82F6', label: 'Đã gán đội', icon: 'account-group' },
  in_progress: { color: '#10B981', label: 'Đang xử lý', icon: 'run' },
  en_route: { color: '#8B5CF6', label: 'Đang di chuyển', icon: 'car-emergency' },
  on_scene: { color: '#F97316', label: 'Tại hiện trường', icon: 'map-marker-check' },
  completed: { color: '#22C55E', label: 'Hoàn thành', icon: 'check-circle' },
  cancelled: { color: '#6B7280', label: 'Đã hủy', icon: 'close-circle' },
};

const URGENCY_COLOR: Record<string, string> = {
  critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#10B981',
};

const MyRescueRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const res = await rescueService.getMyRescueRequests();
      const items = res.data?.data || res.data || [];
      setRequests(Array.isArray(items) ? items : []);
    } catch { /* */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderItem = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const urgColor = URGENCY_COLOR[item.urgency] || '#6B7280';
    const statusLabel = t(`citizen.rescue.status.${item.status}`, { defaultValue: status.label });
    const categoryTrans = t(`citizen.rescue.form.${item.category}`, { defaultValue: item.category_label || item.category });
    const urgencyTrans = t(`citizen.rescue.form.${item.urgency === 'low' ? 'urgency_low' : item.urgency}`, { defaultValue: item.urgency_label || item.urgency });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RescueRequestDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.urgencyDot, { backgroundColor: urgColor }]} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {categoryTrans} — {urgencyTrans}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <Icon name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{statusLabel}</Text>
          </View>
        </View>

        {item.address && (
          <View style={styles.infoRow}>
            <Icon name="map-marker-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Icon name="account-multiple" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            {t('citizen.rescue.peopleCountValue', { count: item.people_count || 1 })}
          </Text>
          <Icon name="clock-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={styles.infoText}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US') : ''}
          </Text>
        </View>

        {item.assigned_team && (
          <View style={styles.teamRow}>
            <Icon name="shield-account" size={14} color={colors.primary} />
            <Text style={styles.teamText}>
              {t('citizen.rescue.teamLabel')}: {item.assigned_team.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title={t('citizen.rescue.myRescueRequests', 'Yêu cầu cứu trợ của tôi')} variant="default" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('citizen.rescue.myRescueRequests', 'Yêu cầu cứu trợ của tôi')}
        variant="default"
        showBack={true}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('RescueRequest')}>
            <Icon name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Icon name="lifebuoy" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>{t('citizen.rescue.noRequests')}</Text>
          </View>
        }
      />
    </View>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.borderLight,
    elevation: 2, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13, color: colors.textSecondary },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  teamText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
});
export default MyRescueRequestsScreen;
