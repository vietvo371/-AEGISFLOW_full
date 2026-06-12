import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, hp } from '../../theme';
import { useNotifications, Notification as WSNotification } from '../../hooks/useNotifications';
import { notificationService } from '../../services/notificationService';
import { Notification as APINotification } from '../../types/api/notification';

// Unified notification type
interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
  source: 'api' | 'websocket';
}

const NotificationsScreen = () => {
  const navigation = useNavigation();

  // WebSocket notifications (realtime)
  const wsHook = useNotifications();

  const [apiNotifications, setApiNotifications] = useState<APINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert API notification to unified format
  const convertAPINotification = (n: any): UnifiedNotification => {
    const reportId = n.data?.id || n.data?.incident_id || n.data?.report_id;
    return {
      id: `api-${n.id}`,
      type: n.type || 'system',
      title: n.title,
      message: n.body || n.message,
      timestamp: new Date(n.created_at),
      read: !!n.read_at,
      data: reportId ? { id: reportId, ...n.data } : n.data,
      source: 'api',
    };
  };

  // Convert WebSocket notification to unified format
  const convertWSNotification = (n: WSNotification): UnifiedNotification => ({
    id: `ws-${n.id}`,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.timestamp,
    read: n.read || false,
    data: n.data,
    source: 'websocket',
  });

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const response = await notificationService.getNotifications();
      console.log('🔍 fetchNotifications response:', response);
      if (response.success) {
        setApiNotifications(response.data?.data || response.data || []);
      } else {
        setError(response.message || 'Không thể tải thông báo');
      }
    } catch (err: any) {
      console.warn('Error fetching notifications:', err?.message || err);
      setError(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  // Merge and sort notifications
  const wsNotifsArray = wsHook?.notifications || [];
  const allNotifications: UnifiedNotification[] = [
    ...wsNotifsArray.map(convertWSNotification),
    ...apiNotifications.map(convertAPINotification),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Helper to group notifications
  const groupNotifications = (notifications: UnifiedNotification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { title: string; data: UnifiedNotification[] }[] = [
      { title: 'Hôm nay', data: [] },
      { title: 'Hôm qua', data: [] },
      { title: 'Cũ hơn', data: [] },
    ];

    notifications.forEach(notif => {
      const notifDate = new Date(notif.timestamp);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        groups[0].data.push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups[1].data.push(notif);
      } else {
        groups[2].data.push(notif);
      }
    });

    return groups.filter(group => group.data.length > 0);
  };

  const notificationSections = groupNotifications(allNotifications);

  const handleMarkAllRead = async () => {
    console.log('📖 Marking all notifications as read...');
    
    // 1. Optimistic Update for UI
    if (wsHook?.markAllAsRead) {
      wsHook.markAllAsRead();
    }
    setApiNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    
    // 2. Perform API Call
    try {
      await notificationService.markAllAsRead();
      setTimeout(() => {
        fetchNotifications(true);
      }, 500);
    } catch (err) {
      console.error('❌ Error marking all as read:', err);
    }
  };

  const handleNotificationPress = async (item: UnifiedNotification) => {
    console.log('🔔 Notification pressed:', item);
    
    // Optimistic reading
    if (!item.read) {
      if (item.source === 'websocket') {
        if (wsHook?.markAsRead) {
          const wsId = item.id.replace('ws-', '');
          wsHook.markAsRead(wsId);
        }
      } 
      
      const apiIdStr = item.id.replace('api-', '');
      if (item.source === 'api' || !isNaN(Number(apiIdStr))) {
        try {
          const apiId = parseInt(apiIdStr);
          setApiNotifications(prev =>
            prev.map(n => n.id === apiId ? { ...n, read_at: new Date().toISOString() } : n)
          );
          await notificationService.markAsRead(apiId);
        } catch (err) {
          console.error('❌ Error marking as read:', err);
        }
      }
    }

    // Navigate to detail
    const isReportNotification = item.type === 'report_status' || 
                                  item.type === 'report_status_update' ||
                                  item.type === 'new_nearby_report';
    const isIncidentNotification = item.type === 'incident_created';
    
    if (isReportNotification && item.data?.id) {
      navigation.navigate('ReportDetail' as any, { 
        id: Number(item.data.id)
      } as any);
    } else if (isIncidentNotification && item.data?.id) {
      navigation.navigate('IncidentDetail' as any, { 
        id: Number(item.data.id)
      } as any);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'report_status':
      case 'report_status_update':
        return 'file-document-edit-outline';
      case 'points_updated':
        return 'star-circle';
      case 'incident_created':
        return 'alert-circle';
      case 'new_nearby_report':
        return 'map-marker-alert';
      default:
        return 'bell-outline';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'report_status':
      case 'report_status_update':
        return theme.colors.primary;
      case 'points_updated':
        return theme.colors.success;
      case 'incident_created':
        return '#F04438';
      case 'new_nearby_report':
        return '#7a5af8';
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: UnifiedNotification }) => {
    const isReportNotification = item.type === 'report_status' ||
      item.type === 'report_status_update';
    const hasReportDetail = isReportNotification && item.data?.id;
    const typeColor = getColorForType(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          !item.read && styles.unreadItem,
          !item.read && { borderLeftColor: typeColor }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrapper, { backgroundColor: typeColor + '12' }]}>
          <Icon name={getIconForType(item.type)} size={22} color={typeColor} />
        </View>

        <View style={styles.itemMainContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitleText, !item.read && styles.unreadTitleText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemTimeText}>
              {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>

          <Text style={[styles.itemMessageText, !item.read && styles.unreadMessageText]} numberOfLines={2}>
            {item.message}
          </Text>

          {hasReportDetail && (
            <View style={styles.actionRow}>
              <View style={[styles.actionBadge, { backgroundColor: typeColor + '10' }]}>
                <Text style={[styles.actionBadgeText, { color: typeColor }]}>Xem chi tiết</Text>
                <Icon name="chevron-right" size={14} color={typeColor} />
              </View>
            </View>
          )}
        </View>
        {!item.read && <View style={[styles.unreadStatusDot, { backgroundColor: typeColor }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Thông báo"
        variant="default"
        rightComponent={
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerRightTextButton} activeOpacity={0.7}>
            <Text style={styles.headerRightText}>Đọc tất cả</Text>
          </TouchableOpacity>
        }
        showBack={true}
        showNotification={false}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <SectionList
          sections={notificationSections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, allNotifications.length === 0 && { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            error ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconOutlineError}>
                  <View style={styles.emptyIconCircleError}>
                    <Icon name="wifi-off" size={42} color="#F04438" />
                  </View>
                </View>
                <Text style={styles.emptyTitle}>Lỗi kết nối máy chủ</Text>
                <Text style={styles.emptySub}>
                  Không thể đồng bộ thông báo từ AegisFlow. Vui lòng kiểm tra lại đường truyền internet của bạn.
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
                  <Icon name="refresh" size={18} color="#F04438" />
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconOutline}>
                  <View style={styles.emptyIconCircle}>
                    <Icon name="bell-off-outline" size={42} color={theme.colors.primary} />
                  </View>
                </View>
                <Text style={styles.emptyTitle}>Hộp thư trống</Text>
                <Text style={styles.emptySub}>Bạn không có thông báo nào vào lúc này.</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.8}>
                  <Icon name="refresh" size={18} color="#FFF" />
                  <Text style={styles.refreshButtonText}>Làm mới</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING['4xl'],
  },
  sectionHeader: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: theme.colors.white,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#090A1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#F5F3FF', // Brand light violet background
    borderLeftWidth: 4,
    borderColor: '#DDD6FE',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  itemMainContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitleText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: SPACING.xs,
  },
  unreadTitleText: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  itemTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  itemMessageText: {
    fontSize: FONT_SIZE.sm,
    color: '#475569',
    lineHeight: 20,
  },
  unreadMessageText: {
    color: '#1E1B4B',
    fontWeight: '500',
  },
  actionRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  unreadStatusDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyCard: {
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
    backgroundColor: 'rgba(122, 90, 248, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(122, 90, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122, 90, 248, 0.15)',
  },
  emptyIconOutlineError: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(240, 68, 56, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyIconCircleError: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(240, 68, 56, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 68, 56, 0.15)',
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: SPACING.sm,
  },
  emptySub: {
    fontSize: FONT_SIZE.xs,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F04438',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#F04438',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerRightTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(122, 90, 248, 0.08)',
  },
  headerRightText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

export default NotificationsScreen;




