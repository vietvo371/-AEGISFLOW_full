import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { reportService } from '../../services/reportService';
import { useAppTheme } from '../../contexts/ThemeContext';
import PageHeader from '../../component/PageHeader';

const CATEGORY_ICONS: Record<number, string> = {
  1: 'road-variant', 2: 'tree-outline', 3: 'fire',
  4: 'trash-can-outline', 5: 'weather-pouring', 6: 'alert-circle-outline',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const MyReportsScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);
  
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

  const getStatusLabel = (trangThai: number) => {
    switch (trangThai) {
      case 0:
        return t('reports.status.received', 'Tiếp nhận');
      case 1:
        return t('reports.status.verified', 'Đã xác minh');
      case 2:
        return t('reports.status.processing', 'Đang xử lý');
      case 3:
        return t('reports.status.completed', 'Hoàn thành');
      case 4:
        return t('reports.status.rejected', 'Từ chối');
      default:
        return t('reports.status.received', 'Tiếp nhận');
    }
  };

  const getStatusStyle = (trangThai: number, themeColors: any) => {
    switch (trangThai) {
      case 0: return { color: themeColors.warning, bg: themeColors.warning + '15' };
      case 1: return { color: themeColors.info, bg: themeColors.info + '15' };
      case 2: return { color: themeColors.primary, bg: themeColors.primary + '15' };
      case 3: return { color: themeColors.success, bg: themeColors.success + '15' };
      case 4: return { color: themeColors.error, bg: themeColors.error + '15' };
      default: return { color: themeColors.warning, bg: themeColors.warning + '15' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.trang_thai, colors);
    const catIcon = CATEGORY_ICONS[item.danh_muc] || 'alert-circle-outline';
    const statusLabel = getStatusLabel(item.trang_thai);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ReportDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.catIcon}>
            <Icon name={catIcon} size={18} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.tieu_de}</Text>
            <Text style={styles.cardDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        </View>

        {item.dia_chi && (
          <View style={styles.addressRow}>
            <Icon name="map-marker-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.addressText} numberOfLines={1}>{item.dia_chi}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && reports.length === 0) {
    return (
      <View style={styles.container}>
        <PageHeader title={t('reports.myReports', 'Báo cáo của tôi')} variant="default" showBack={true} />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('reports.myReports', 'Báo cáo của tôi')}
        variant="default"
        showBack={true}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('CreateReport')} style={styles.addBtn}>
            <Icon name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

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
            <Icon name="file-document-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('reports.noReports', 'Chưa có báo cáo nào')}</Text>
            <Text style={styles.emptyDesc}>{t('reports.myReportsDesc', 'Báo cáo của bạn sẽ hiển thị ở đây')}</Text>
          </View>
        }
      />
    </View>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardContent: { flex: 1 },
  catIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  cardDate: { fontSize: 12, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  addressText: { flex: 1, fontSize: 12, color: colors.textSecondary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyDesc: { fontSize: 13, color: colors.textSecondary },
});

export default MyReportsScreen;
