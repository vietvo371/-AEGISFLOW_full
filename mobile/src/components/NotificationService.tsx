import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
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
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('Đã được cấp quyền thông báo');
        await getToken();
      } else {
        console.log('Quyền thông báo bị từ chối');
      }
    } else {
      await getToken();
    }
  };

  // Lấy Firebase token và đồng bộ
  const getToken = async () => {
    try {
      await NotificationTokenService.registerTokenAfterLogin();
    } catch (error) {
      console.error('❌ Lỗi khi khởi tạo FCM token trong NotificationService:', error);
    }
  };

  useEffect(() => {
    // Xin quyền khi component được mount
    requestUserPermission();

    // Xử lý thông báo khi app ở foreground
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('Thông báo nhận được khi app đang mở:', remoteMessage);
      
      if (onNotification) {
        onNotification(remoteMessage);
      }
      
      // Hiển thị alert cho thông báo foreground
      // if (remoteMessage.notification) {
      //   Alert.alert(
      //     remoteMessage.notification.title || 'Thông báo',
      //     remoteMessage.notification.body || '',
      //     [{ text: 'OK' }]
      //   );
      // }
    });

    // Xử lý khi người dùng nhấp vào thông báo và app đang ở background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(
      remoteMessage => {
        console.log('Mở từ thông báo khi app ở background:', remoteMessage);
        
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
            'App mở từ thông báo khi đang tắt:',
            remoteMessage,
          );
          
          if (onNotificationOpened) {
            onNotificationOpened(remoteMessage);
          }
        }
      })
      .catch(error => {
        console.log('Lỗi khi lấy thông báo ban đầu:', error);
      });

    // Xử lý khi token được refresh
    const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(async token => {
      console.log('🔄 FCM Token đã được làm mới:', token);
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
