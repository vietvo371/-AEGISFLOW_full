import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import { reportService } from '../../services/reportService';

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Tiếp nhận', color: '#F59E0B' },
  1: { label: 'Đã xác minh', color: '#3B82F6' },
  2: { label: 'Đang xử lý', color: '#7a5af8' },
  3: { label: 'Hoàn thành', color: '#10B981' },
  4: { label: 'Từ chối', color: '#EF4444' },
};

const CATEGORY_ICONS: Record<number, string> = {
  1: 'road-variant', 2: 'tree-outline', 3: 'fire',
  4: 'trash-can-outline', 5: 'weather-pouring', 6: 'alert-circle-outline',
};

const MyReportsScreen = () => {
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchReports = useCallback(async (p = 1, refresh = false) => {
    try {
      if (p === 1) setLoading(true);
      const res = await reportService.getMyReports({ page: p, per_page: 15 });
      if (res.success) {
        const items = res.data?.data || res.data || [];
        if (refresh || p === 1) {
          setReports(items);
        } else {
          setReports(prev => [...prev, ...items]);
        }
        setHasMore(items.length >= 15);
        setPage(p);
      }
    } catch { /* */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchReports(1, true); }, [fetchReports]));

  const onRefresh = () => { setRefreshing(true); fetchReports(1, true); };
  const loadMore = () => { if (hasMore && !loading) fetchReports(page + 1); };

  const renderItem = ({ item }: { item: any }) => {
    const status = STATUS_MAP[item.trang_thai] || STATUS_MAP[0];
    const catIcon = CATEGORY_ICONS[item.danh_muc] || 'alert-circle-outline';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ReportDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.catIcon}>
            <Icon name={catIcon} size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.tieu_de}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {item.dia_chi && (
          <View style={styles.addressRow}>
            <Icon name="map-marker-outline" size={14} color={theme.colors.textTertiary} />
            <Text style={styles.addressText} numberOfLines={1}>{item.dia_chi}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && reports.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Báo cáo của tôi</Text>
        </View>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo của tôi</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateReport')} style={styles.addBtn}>
          <Icon name="plus" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="file-document-outline" size={56} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Chưa có báo cáo nào</Text>
            <Text style={styles.emptyDesc}>Báo cáo của bạn sẽ hiển thị ở đây</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.text },
  addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  catIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  cardDate: { fontSize: 12, color: theme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  addressText: { flex: 1, fontSize: 12, color: theme.colors.textSecondary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  emptyDesc: { fontSize: 13, color: theme.colors.textSecondary },
});

export default MyReportsScreen;
