import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import Toast from 'react-native-toast-message';
import { AlertService } from '../services/AlertService.tsx';
import messaging from '@react-native-firebase/messaging';

export interface Notification {
  id: string;
  type: 'report_status' | 'report_status_update' | 'points_updated' | 'new_nearby_report' | 'incident_created' | 'alert' | 'flood_warning' | 'rescue_dispatch' | 'rescue_status_update';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read?: boolean;
}

type RefreshCallback = () => void;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  registerRefreshCallback: (callback: RefreshCallback) => () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let refreshCallbacks: RefreshCallback[] = [];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { isConnected, subscribe, unsubscribe, listen, subscribePusher } = useWebSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Count from backend API (persisted, may lag slightly behind WS events)
  const [apiUnreadCount, setApiUnreadCount] = useState(0);

  // Real-time unread count: at least as large as the number of unread WS notifications
  // so the badge updates instantly when a new WS event arrives.
  const wsUnreadCount = notifications.filter(n => !n.read).length;
  const unreadCount = Math.max(apiUnreadCount, wsUnreadCount);

  // Function to fetch unread count from API
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setApiUnreadCount(0);
      return;
    }

    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        console.log('📊 [Global Context] Unread count from API:', response.data.count);
        setApiUnreadCount(response.data.count);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setApiUnreadCount(0);
        return;
      }
      console.warn('Could not fetch unread notification count:', error?.message || error);
    }
  }, [user?.id]);

  // Function to register refresh callback
  const registerRefreshCallback = useCallback((callback: RefreshCallback) => {
    refreshCallbacks.push(callback);
    return () => {
      refreshCallbacks = refreshCallbacks.filter(cb => cb !== callback);
    };
  }, []);

  // Function to trigger all refresh callbacks
  const triggerRefresh = useCallback(() => {
    console.log('🔄 Triggering refresh callbacks:', refreshCallbacks.length);
    refreshCallbacks.forEach(callback => callback());
  }, []);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
    }
  }, [user?.id, fetchUnreadCount]);

  useEffect(() => {
    if (!isConnected || !user?.id) {
      console.log('⚠️ [Global Context] useNotifications - Not ready:', { isConnected, userId: user?.id });
      return;
    }

    console.log('🎯 [Global Context] Setting up WebSocket listeners for user:', user.id);

    // Subscribe to user's private channel
    const userChannel = `private-user.${user.id}`;
    subscribe(userChannel);

    // Subscribe to public user-reports channel
    const publicChannel = 'user-reports';
    subscribe(publicChannel);

    // Subscribe to traffic broadcast channel (IncidentCreated events)
    const trafficChannel = 'traffic';
    subscribe(trafficChannel);

    // Subscribe to public flood channel (AlertCreated events)
    const floodChannel = 'flood';
    subscribe(floodChannel);

    // ─── Chống trùng giữa WebSocket và FCM ──────────────────────────────────
    // Cùng một sự kiện (vd alert) có thể đến qua CẢ WebSocket (foreground) LẪN
    // FCM push. Dùng khoá theo entity-id để mỗi sự kiện chỉ hiện banner 1 lần
    // và chỉ thêm vào danh sách 1 lần.
    const shownBanners = new Set<string>();
    const bannerKeyFor = (type: string, data: any): string => {
      const id =
        data?.id ?? data?.alert_id ?? data?.incident_id ??
        data?.prediction_id ?? data?.rescue_id ?? '';
      return `${type}:${id}`;
    };
    const showBannerOnce = (key: string, show: () => void) => {
      if (key && shownBanners.has(key)) return;
      if (key) shownBanners.add(key);
      show();
    };
    // Thêm notification vào danh sách, bỏ qua nếu trùng id
    const addNotif = (n: Notification) =>
      setNotifications(prev => (prev.some(x => x.id === n.id) ? prev : [n, ...prev]));

    // Handler cho report status updates
    const handleReportStatusUpdate = (data: any) => {
      console.log('📢 Report status updated:', data);
      console.log('📢 Event data structure:', JSON.stringify(data, null, 2));

      const reportTitle = data.report?.tieu_de || 'Phản ánh của bạn';
      const newStatus = data.new_status ?? data.report?.trang_thai;
      const oldStatus = data.old_status;
      const statusText = data.status_text || getStatusText(newStatus);

      // Tạo message dựa trên status change
      let message = '';

      switch (newStatus) {
        case 0: // Tiếp nhận
          message = `"${reportTitle}" đã được tiếp nhận`;
          break;
        case 1: // Xác minh
          message = `"${reportTitle}" đang được xác minh`;
          break;
        case 2: // Đang xử lý
          message = `"${reportTitle}" đang được xử lý`;
          break;
        case 3: // Hoàn thành
          message = `"${reportTitle}" đã hoàn thành`;
          break;
        case 4: // Từ chối
          message = `"${reportTitle}" đã bị từ chối`;
          break;
        default:
          message = `"${reportTitle}" đã cập nhật: ${statusText}`;
      }

      const notification: Notification = {
        id: `report-${data.report_id || Date.now()}`,
        type: 'report_status',
        title: 'Cập nhật trạng thái',
        message: message,
        data: {
          ...data.report,
          old_status: oldStatus,
          new_status: newStatus,
          status_text: statusText,
        },
        timestamp: new Date(),
        read: false,
      };

      setNotifications(prev => [notification, ...prev]);

      console.log('✅ Notification created:', notification);

      // Fetch updated unread count from API
      fetchUnreadCount();

      // Trigger refresh for HomeScreen and Map
      triggerRefresh();
    };

    // Listen to report status updates - one canonical format per channel to avoid duplicate processing.
    // Previously 5 formats were registered; if the server uses App\Events\ReportStatusUpdated AND
    // 'report.status.updated' both matched, the handler would fire twice for a single broadcast.
    try {
      listen(userChannel, 'report.status.updated', handleReportStatusUpdate);
      listen(publicChannel, 'report.status.updated', handleReportStatusUpdate);
      console.log('✅ Registered Echo listeners for report.status.updated');
    } catch (error) {
      console.error('❌ Failed to register Echo listeners:', error);
    }


    // Method 2 (Pusher direct) intentionally removed — Echo listener above already handles this.
    // Having both caused each report.status.updated event to fire handleReportStatusUpdate twice.

    // Listen to points updates
    listen(userChannel, 'points.updated', (data) => {
      console.log('💰 Points updated:', data);

      const change = data.change || data.points_change || 0;
      const newBalance = data.new_balance || data.total_points || data.points || 0;
      const reason = data.reason || data.ly_do || 'Cập nhật điểm';

      const notification: Notification = {
        id: `points-${Date.now()}`,
        type: 'points_updated',
        title: change > 0 ? 'Điểm uy tín tăng' : 'Điểm uy tín giảm',
        message: `${change > 0 ? '+' : ''}${change} điểm (${reason}). Tổng: ${newBalance} điểm`,
        data,
        timestamp: new Date(),
        read: false,
      };

      setNotifications(prev => [notification, ...prev]);
      fetchUnreadCount();
      triggerRefresh();
    });

    // Listen to new incident events (AegisFlowAI) — private channel
    listen(userChannel, 'incident.created', (data) => {
      console.log('🚨 New incident created (private):', data);

      const notification: Notification = {
        id: `incident-${data.id || Date.now()}`,
        type: 'incident_created',
        title: 'Sự cố mới',
        message: data.title || data.tieu_de || 'Có sự cố mới trong khu vực',
        data,
        timestamp: new Date(),
        read: false,
      };

      setNotifications(prev => [notification, ...prev]);
      fetchUnreadCount();
      triggerRefresh();
    });

    // Listen to IncidentCreated broadcast on traffic channel.
    // Previously 2 event formats were registered separately, so a single broadcast
    // could match both and create two notifications. Now using one handler.
    try {
      const handleIncidentCreated = (data: any) => {
        console.log('🚨 [Traffic] IncidentCreated broadcast:', data);

        const notification: Notification = {
          id: `traffic-incident-${data.id || Date.now()}`,
          type: 'incident_created',
          title: `Sự cố ${data.severity || ''}`.trim(),
          message: data.title || 'Sự cố giao thông mới',
          data,
          timestamp: new Date(),
          read: false,
        };

        setNotifications(prev => [notification, ...prev]);
        fetchUnreadCount();
        triggerRefresh();
      };

      listen(trafficChannel, 'IncidentCreated', handleIncidentCreated);
      console.log('✅ Registered traffic channel IncidentCreated listener');
    } catch (error) {
      console.error('❌ Failed to register traffic channel listeners:', error);
    }


    // ─── Unified notification.sent listener ────────────────────────────────
    // CHỈ đăng ký MỘT listener cho 'notification.sent'.
    // pusher-js KHÔNG hỗ trợ nhiều handler trên cùng event+channel —
    // đăng ký lần 2 sẽ OVERRIDE lần 1, gây ra duplicate notification
    // và alert không hiển thị.
    const handleNotificationSent = (data: any) => {
      console.log('🔔 [Notification] Received:', data.type, data.title);

      const type = (data.type || 'report_status') as Notification['type'];

      const notification: Notification = {
        id: `notif-${data.id || Date.now()}`,
        type,
        title: data.title || data.tieu_de || 'Thông báo mới',
        message: data.message || data.noi_dung || '',
        data,
        timestamp: new Date(),
        read: false,
      };

      setNotifications(prev => {
        // Chống duplicate theo ID
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      fetchUnreadCount();
      triggerRefresh();

      // Hiện Alert hoặc Toast tuỳ loại thông báo (chỉ 1 lần, tránh trùng FCM)
      showBannerOnce(bannerKeyFor(type, data), () => {
        if (type === 'rescue_dispatch') {
          // Chỉ hiện modal Alert — không hiện thêm Toast để tránh trùng
          AlertService.alert(
            notification.title,
            notification.message,
            [{ text: 'Xem nhiệm vụ', style: 'default' }],
            'info'
          );
        } else {
          const titleLower = notification.title.toLowerCase();
          const isCritical =
            type === 'incident_created' ||
            data.urgency === 'critical' ||
            data.severity === 'critical' ||
            data.severity === 'high' ||
            titleLower.includes('khẩn cấp') ||
            titleLower.includes('sơ tán') ||
            titleLower.includes('nguy hiểm');

          if (isCritical) {
            AlertService.alert(
              notification.title,
              notification.message,
              [{ text: 'Đóng', style: 'default' }],
              'info'
            );
          } else {
            Toast.show({
              type: 'info',
              text1: notification.title,
              text2: notification.message,
              visibilityTime: 4000,
            });
          }
        }
      });
    };

    try {
      listen(userChannel, 'notification.sent', handleNotificationSent);
      console.log('✅ [Notification] Single listener registered for notification.sent');
    } catch (error) {
      console.error('❌ [Notification] Failed to register notification.sent listener:', error);
    }

    // Listen to AlertCreated events on the public flood channel
    try {
      const handleAlertCreated = (data: any) => {
        console.log('🚨 [Flood Channel] AlertCreated broadcast received:', data);

        const severityMap: Record<string, string> = {
          critical: '🔴 Nguy hiểm',
          high: '🟠 Cao',
          medium: '🟡 Trung bình',
          low: '🔵 Thấp',
        };
        const severityLabel = severityMap[data.severity] || '⚠️ Cảnh báo';

        const notification: Notification = {
          id: `alert-${data.id || Date.now()}`,
          type: 'alert',
          title: `${severityLabel}: ${data.title}`.trim(),
          message: data.description || 'Có cảnh báo ngập lụt mới trong khu vực.',
          data: {
            ...data,
            id: data.id,
            alert_id: data.id,
          },
          timestamp: new Date(),
          read: false,
        };

        addNotif(notification);
        fetchUnreadCount();
        triggerRefresh();

        // High severity alerts show modal popup
        const isCritical = data.severity === 'critical' || data.severity === 'high';
        showBannerOnce(bannerKeyFor('alert', data), () => {
          if (isCritical) {
            AlertService.alert(
              `🚨 ${data.title}`,
              data.description || 'Có cảnh báo ngập lụt mới trong khu vực. Vui lòng kiểm tra chi tiết và sơ tán nếu cần thiết.',
              [{ text: 'Đóng', style: 'cancel' }],
              'error'
            );
          } else {
            // Medium/low severity: show Toast banner
            Toast.show({
              type: 'info',
              text1: notification.title,
              text2: notification.message,
              visibilityTime: 4000,
            });
          }
        });
      };

      // Listen to AlertCreated using a single canonical format.
      // Previously 2 formats (AlertCreated + App\Events\AlertCreated) were both registered
      // which caused one server broadcast to create two notifications.
      listen(floodChannel, 'AlertCreated', handleAlertCreated);
      console.log('✅ Registered flood channel AlertCreated listener');
    } catch (error) {
      console.error('❌ Failed to register flood channel listeners:', error);
    }

    // ── FCM Foreground: hiển thị MỌI loại push khi app đang mở ─────────────────
    // Khi app ở foreground, iOS/Android KHÔNG tự hiện banner hệ thống cho FCM.
    // Ta phải tự bắt message và hiển thị. Trước đây chỉ xử lý rescue_dispatch nên
    // alert/incident/flood_warning gửi từ admin không hiện gì trên màn hình.
    const unsubFcm = messaging().onMessage(async remoteMessage => {
      const data = (remoteMessage.data || {}) as Record<string, string>;
      const fcmType = data.type ?? '';

      console.log('🔔 [FCM Foreground] message received:', fcmType, data);

      const title = remoteMessage.notification?.title || data.title || 'Thông báo mới';
      const body =
        remoteMessage.notification?.body || data.message || data.description || '';

      // Map loại FCM → loại + id nội bộ (khớp scheme WebSocket để chống trùng danh sách)
      let notifType: Notification['type'] = 'alert';
      let idPrefix = 'notif';
      let entityId = data.id || '';
      switch (fcmType) {
        case 'alert':
          notifType = 'alert'; idPrefix = 'alert';
          entityId = data.id || data.alert_id || '';
          break;
        case 'flood_warning':
          notifType = 'flood_warning'; idPrefix = 'alert';
          entityId = data.id || data.prediction_id || '';
          break;
        case 'incident':
          notifType = 'incident_created'; idPrefix = 'incident';
          entityId = data.id || data.incident_id || '';
          break;
        case 'rescue':
        case 'rescue_dispatch':
          notifType = 'rescue_dispatch'; idPrefix = 'rescue';
          entityId = data.id || data.rescue_id || '';
          break;
        default:
          notifType = 'report_status'; idPrefix = 'notif';
          entityId = data.id || '';
      }

      const notification: Notification = {
        id: `${idPrefix}-${entityId || Date.now()}`,
        type: notifType,
        title,
        message: body,
        data,
        timestamp: new Date(),
        read: false,
      };

      addNotif(notification);
      fetchUnreadCount();
      triggerRefresh();

      // Hiển thị popup/Toast — chỉ 1 lần kể cả khi cùng sự kiện đến qua WebSocket
      showBannerOnce(bannerKeyFor(fcmType, data), () => {
        if (notifType === 'rescue_dispatch') {
          // Chỉ hiện modal Alert — không hiện thêm Toast để tránh trùng
          AlertService.alert(
            title, body,
            [{ text: 'Xem nhiệm vụ', style: 'default' }],
            'info'
          );
          return;
        }

        const titleLower = title.toLowerCase();
        const isCritical =
          data.severity === 'critical' ||
          data.severity === 'high' ||
          data.urgency === 'critical' ||
          data.risk_level === 'critical' ||
          data.risk_level === 'high' ||
          titleLower.includes('khẩn cấp') ||
          titleLower.includes('sơ tán') ||
          titleLower.includes('nguy hiểm');

        if (isCritical) {
          AlertService.alert(
            title, body,
            [{ text: 'Đóng', style: 'default' }],
            'error'
          );
        } else {
          Toast.show({
            type: 'info',
            text1: title,
            text2: body,
            visibilityTime: 4000,
          });
        }
      });
    });

    // Cleanup
    return () => {
      unsubscribe(userChannel);
      unsubscribe(trafficChannel);
      unsubscribe(floodChannel);
      unsubFcm(); // Remove FCM foreground listener
    };
  }, [
    fetchUnreadCount,
    isConnected,
    listen,
    subscribe,
    subscribePusher,
    triggerRefresh,
    unsubscribe,
    user?.id,
  ]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    // Also sync API count after a short delay so badge doesn't flicker
    setTimeout(fetchUnreadCount, 300);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setApiUnreadCount(0);
    fetchUnreadCount();
  };

  const clearAll = () => {
    setNotifications([]);
    setApiUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        registerRefreshCallback,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Helper functions
function getStatusText(status: number): string {
  switch (status) {
    case 0: return 'tiếp nhận';
    case 1: return 'xác minh';
    case 2: return 'đang xử lý';
    case 3: return 'hoàn thành';
    case 4: return 'từ chối';
    default: return 'cập nhật';
  }
}
