import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, SCREEN_PADDING, hp } from '../../theme';
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
  console.log('🔍 wsHook:', wsHook);

  const [apiNotifications, setApiNotifications] = useState<APINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Convert API notification to unified format
  const convertAPINotification = (n: any): UnifiedNotification => {
    // Standardize incident ID extraction
    const reportId = n.data?.id || n.data?.incident_id;
    return {
      id: `api-${n.id}`,
      type: n.type || 'system',
      title: n.title,
      message: n.message,
      timestamp: new Date(n.created_at || n.ngay_tao),
      read: !!n.read,
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
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getNotifications();
      console.log('🔍 fetchNotifications response:', response);
      if (response.success) {
        setApiNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
    fetchNotifications();
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
    
    // 1. Optimistic Update for UI (Instant feedback)
    // Mark WebSocket notifications in hook
    if (wsHook?.markAllAsRead) {
      wsHook.markAllAsRead();
    }
    
    // Mark API notifications in local state
    setApiNotifications(prev => prev.map(n => ({ ...n, da_doc: true })));
    
    // 2. Perform API Call
    try {
      const response = await notificationService.markAllAsRead();
      console.log('✅ API Mark all as read response:', response);
      
      // 3. Refetch to sync with server truth after a short delay to allow DB processing
      setTimeout(() => {
        fetchNotifications();
      }, 500);
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      // Optional: Rollback if needed, but usually users prefer keeping it "read" visually
    }
  };

  const handleNotificationPress = async (item: UnifiedNotification) => {
    console.log('🔔 Notification pressed:', item);
    
    // Optimistic reading
    if (!item.read) {
      console.log('📖 Marking single notification as read...');
      
      // WebSocket source handling
      if (item.source === 'websocket') {
        if (wsHook?.markAsRead) {
          const wsId = item.id.replace('ws-', '');
          wsHook.markAsRead(wsId);
        }
      } 
      
      // API source handling
      const apiIdStr = item.id.replace('api-', '');
      if (item.source === 'api' || !isNaN(Number(apiIdStr))) {
        try {
          const apiId = parseInt(apiIdStr);
          // Mark in local state optimistically
          setApiNotifications(prev =>
            prev.map(n => n.id === apiId ? { ...n, da_doc: true } : n)
          );
          await notificationService.markAsRead(apiId);
        } catch (error) {
          console.error('❌ Error marking as read:', error);
        }
      }
    }

    // Navigate to report/incident detail
    const isReportNotification = item.type === 'report_status' || 
                                  item.type === 'report_status_update';
    const isIncidentNotification = item.type === 'incident_created';
    
    if ((isReportNotification || isIncidentNotification) && item.data?.id) {
      console.log('🚀 Navigating to Detail with ID:', item.data.id);
      navigation.navigate('IncidentDetail' as any, { 
        id: item.data.id
      } as any);
    } else {
      console.log('⚠️ No detail data to navigate to. Type:', item.type, 'Data:', item.data);
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
        return '#EF4444';
      case 'new_nearby_report':
        return '#8B5CF6';
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
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrapper, { backgroundColor: typeColor + '10' }]}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader
        title="Thông báo"
        variant="default"
        rightIcon="check-all"
        onRightPress={handleMarkAllRead}
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
          contentContainerStyle={styles.listContainer}
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
            <View style={styles.emptyWrapper}>
              <View style={styles.emptyIconCircle}>
                <Icon name="bell-off-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Hộp thư trống</Text>
              <Text style={styles.emptySub}>Bạn không có thông báo nào vào lúc này</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  unreadItem: {
    backgroundColor: '#F7F9FC',
    borderLeftWidth: 4,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    color: '#0F172A',
  },
  itemTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  itemMessageText: {
    fontSize: FONT_SIZE.sm,
    color: '#64748B',
    lineHeight: 20,
  },
  unreadMessageText: {
    color: '#334155',
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
  emptyWrapper: {
    paddingTop: hp('15%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});

export default NotificationsScreen;


