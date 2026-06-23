import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../../component/PageHeader';
import { SPACING, FONT_SIZE, BORDER_RADIUS, hp } from '../../theme';
import { useNotifications, Notification as WSNotification } from '../../hooks/useNotifications';
import { notificationService } from '../../services/notificationService';
import { Notification as APINotification } from '../../types/api/notification';
import { useAppTheme } from '../../contexts/ThemeContext';

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
  const { colors, isDark, theme } = useAppTheme();
  const styles = getStyles(colors, isDark, theme);

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
      const response = await notificationService.getNotifications() as any;
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

  // Merge and deduplicate notifications from WebSocket (realtime) and API (persisted)
  const wsNotifsArray = wsHook?.notifications || [];

  const apiConverted = apiNotifications.map(convertAPINotification);
  const wsConverted = wsNotifsArray.map(convertWSNotification);

  // Build a fingerprint set from API notifications
  const apiFingerprints = new Set(
    apiConverted.map(n => {
      const minuteTs = Math.floor(n.timestamp.getTime() / 60000);
      return `${n.title}|${n.message}|${minuteTs}`;
    })
  );

  // Only include WS notifications that don't already exist in API list
  const uniqueWsNotifs = wsConverted.filter(n => {
    const minuteTs = Math.floor(n.timestamp.getTime() / 60000);
    const fp = `${n.title}|${n.message}|${minuteTs}`;
    return !apiFingerprints.has(fp);
  });

  const allNotifications: UnifiedNotification[] = [
    ...uniqueWsNotifs,
    ...apiConverted,
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
    const isIncidentNotification = item.type === 'incident_created' || item.type === 'IncidentCreated';
    const isRescueDispatch = item.type === 'rescue_dispatch' || item.type === 'rescue_status_update';
    const isFloodWarning = item.type === 'flood_warning' || item.type === 'alert' || item.type === 'AlertCreated';
    const isAIRecommendation = item.type === 'ai_recommendation' || item.type === 'recommendation' || item.type === 'RecommendationApproved';

    if (isRescueDispatch && (item.data?.rescue_id || item.data?.id)) {
      navigation.navigate('RescueRequestDetail' as any, {
        id: Number(item.data?.rescue_id ?? item.data?.id)
      } as any);
    } else if (isFloodWarning && (item.data?.id || item.data?.alert_id)) {
      navigation.navigate('AlertDetail' as any, {
        id: Number(item.data?.id ?? item.data?.alert_id)
      } as any);
    } else if (isAIRecommendation && item.data?.id) {
      navigation.navigate('ReportDetail' as any, {
        id: Number(item.data.id),
        sourceType: 'ai_recommendation',
      } as any);
    } else if (isIncidentNotification && item.data?.id) {
      navigation.navigate('IncidentDetail' as any, {
        id: Number(item.data.id)
      } as any);
    } else if (isReportNotification && item.data?.id) {
      navigation.navigate('ReportDetail' as any, {
        id: Number(item.data.id),
        sourceType: 'report',
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
      case 'IncidentCreated':
        return 'alert-circle';
      case 'new_nearby_report':
        return 'map-marker-alert';
      case 'alert':
      case 'AlertCreated':
      case 'flood_warning':
        return 'weather-pouring';
      case 'RecommendationApproved':
      case 'ai_recommendation':
      case 'recommendation':
        return 'brain';
      case 'rescue_dispatch':
      case 'rescue_status_update':
        return 'lifebuoy';
      default:
        return 'bell-outline';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'report_status':
      case 'report_status_update':
        return colors.primary;
      case 'points_updated':
        return colors.success;
      case 'incident_created':
      case 'IncidentCreated':
        return colors.error;
      case 'new_nearby_report':
        return colors.primary;
      case 'alert':
      case 'AlertCreated':
      case 'flood_warning':
        return colors.error;
      case 'RecommendationApproved':
      case 'ai_recommendation':
      case 'recommendation':
        return colors.success;
      case 'rescue_dispatch':
      case 'rescue_status_update':
        return colors.secondary;
      default:
        return colors.textSecondary;
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
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.unreadDotPlaceholder}>
          {!item.read && <View style={[styles.leftUnreadDot, { backgroundColor: typeColor }]} />}
        </View>

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
        <Icon name="chevron-right" size={16} color={colors.textTertiary} style={{ marginLeft: 8, alignSelf: 'center' }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Thông báo"
        variant="default"
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerRightTextButton} activeOpacity={0.7}>
              <Text style={styles.headerRightText}>Đọc tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('NotificationSettings' as any)} style={styles.settingsHeaderBtn} activeOpacity={0.7}>
              <Icon name="cog-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
        showBack={true}
        showNotification={false}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <SectionList
          sections={notificationSections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, allNotifications.length === 0 && { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            error ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconOutlineError}>
                  <View style={styles.emptyIconCircleError}>
                    <Icon name="wifi-off" size={42} color={colors.error} />
                  </View>
                </View>
                <Text style={styles.emptyTitle}>Lỗi kết nối máy chủ</Text>
                <Text style={styles.emptySub}>
                  Không thể đồng bộ thông báo từ AegisFlow. Vui lòng kiểm tra lại đường truyền internet của bạn.
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
                  <Icon name="refresh" size={18} color={colors.error} />
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconOutline}>
                  <View style={styles.emptyIconCircle}>
                    <Icon name="bell-off-outline" size={42} color={colors.primary} />
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

const getStyles = (colors: any, isDark: boolean, theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  listContainer: {
    paddingBottom: SPACING['4xl'],
  },
  sectionHeader: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 4,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: isDark ? 'rgba(122, 90, 248, 0.08)' : '#FAF9FF',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  unreadTitleText: {
    fontWeight: '700',
    color: colors.text,
  },
  itemTimeText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '400',
  },
  itemMessageText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  unreadMessageText: {
    color: colors.text,
    fontWeight: '400',
  },
  actionRow: {
    marginTop: SPACING.xs,
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
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: colors.textSecondary,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.04)' : 'rgba(122, 90, 248, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.08)' : 'rgba(122, 90, 248, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.1)',
  },
  emptyIconOutlineError: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.04)' : 'rgba(240, 68, 56, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyIconCircleError: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.08)' : 'rgba(240, 68, 56, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(240, 68, 56, 0.1)',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(155, 138, 251, 0.15)' : 'rgba(122, 90, 248, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(240, 68, 56, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  retryButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  headerRightTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerRightText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  settingsHeaderBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDotPlaceholder: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  leftUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 82,
  },
});

export default NotificationsScreen;
