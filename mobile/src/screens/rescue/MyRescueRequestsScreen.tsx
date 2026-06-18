import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { rescueService } from '../../services/rescueService';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  pending: { color: '#EAB308', label: 'Đang chờ', icon: 'clock-outline' },
  assigned: { color: '#3B82F6', label: 'Đã gán đội', icon: 'account-group' },
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

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RescueRequestDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.urgencyDot, { backgroundColor: urgColor }]} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.category_label || item.category} — {item.urgency_label || item.urgency}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <Icon name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {item.address && (
          <View style={styles.infoRow}>
            <Icon name="map-marker-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Icon name="account-multiple" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>{item.people_count || 1} người</Text>
          <Icon name="clock-outline" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={styles.infoText}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : ''}
          </Text>
        </View>

        {item.assigned_team && (
          <View style={styles.teamRow}>
            <Icon name="shield-account" size={14} color={theme.colors.primary} />
            <Text style={styles.teamText}>Đội: {item.assigned_team.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Yêu cầu cứu hộ của tôi</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RescueRequest')}>
          <Icon name="plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Icon name="lifebuoy" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>Chưa có yêu cầu cứu hộ</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.colors.white, borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13, color: theme.colors.textSecondary },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  teamText: { fontSize: 13, fontWeight: '500', color: theme.colors.primary },
  emptyText: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
});

export default MyRescueRequestsScreen;
