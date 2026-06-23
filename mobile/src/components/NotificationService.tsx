import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import NotificationTokenService from '../services/NotificationTokenService';

interface NotificationServiceProps {
  onNotification?: (notification: any) => void;
  onNotificationOpened?: (notification: any) => void;
}

const NotificationService: React.FC<NotificationServiceProps> = ({
  onNotification,
  onNotificationOpened,
}) => {
  // Xin quyền thông báo
  const requestUserPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ [FCM] Đã được cấp quyền thông báo');
          await getToken();
        } else {
          console.log('⚠️ [FCM] Quyền thông báo bị từ chối');
        }
      } else {
        await getToken();
      }
    } catch (error: any) {
      console.error('❌ [FCM] Lỗi xin quyền thông báo:', error);
    }
  };

  // Lấy Firebase token và đồng bộ
  const getToken = async () => {
    try {
      const result = await NotificationTokenService.registerTokenAfterLogin();
      if (result.success) {
        console.log('✅ [FCM] Đăng ký token thành công, deviceId:', result.deviceId);
      } else {
        // iOS simulator không thể lấy FCM token — đây là hành vi bình thường, không hiện toast lỗi
        const isSimulatorError =
          result.error?.includes('aps-environment') ||
          result.error?.includes('không tìm thấy') ||
          result.error?.includes('FCM token từ Firebase');
        if (isSimulatorError) {
          console.log('ℹ️ [FCM] Không lấy được token (iOS Simulator không hỗ trợ FCM):', result.error);
        } else {
          console.warn('⚠️ [FCM] Đồng bộ thông báo thất bại:', result.error);
        }
      }
    } catch (error: any) {
      console.error('❌ [FCM] Lỗi khởi tạo token:', error?.message || String(error));
    }
  };

  useEffect(() => {
    // Xin quyền khi component được mount
    requestUserPermission();

    // Xử lý thông báo khi app ở foreground — NotificationContext cũng xử lý
    // nhưng handler này có thể dùng cho custom onNotification callback nếu cần
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('📩 [FCM] Thông báo nhận được khi app đang mở:', remoteMessage.notification?.title);

      if (onNotification) {
        onNotification(remoteMessage);
      }
    });

    // Xử lý khi người dùng nhấp vào thông báo và app đang ở background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(
      remoteMessage => {
        console.log('🔔 [FCM] Mở từ thông báo khi app ở background:', remoteMessage.notification?.title);

        if (onNotificationOpened) {
          onNotificationOpened(remoteMessage);
        }
      },
    );

    // Kiểm tra xem app có được mở từ thông báo khi app bị tắt không
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            '🚀 [FCM] App mở từ thông báo khi đang tắt:',
            remoteMessage.notification?.title,
          );

          if (onNotificationOpened) {
            onNotificationOpened(remoteMessage);
          }
        }
      })
      .catch(error => {
        console.log('[FCM] Lỗi khi lấy thông báo ban đầu:', error);
      });

    // Xử lý khi token được refresh
    const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(async token => {
      console.log('🔄 [FCM] Token được làm mới');
      await NotificationTokenService.updateTokenOnRefresh(token);
    });

    // Clean up các event listeners khi component unmount
    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      unsubscribeOnTokenRefresh();
    };
  }, [onNotification, onNotificationOpened]);

  // Component này không render bất kỳ UI nào
  return null;
};

export default NotificationService;
