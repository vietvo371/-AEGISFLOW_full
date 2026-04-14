import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

class PushNotificationHelper {
  // Kiểm tra quyền thông báo hiện tại
  static async checkPermission() {
    const authStatus = await messaging().hasPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    return enabled;
  }

  // Xin quyền thông báo
  static async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('Đã được cấp quyền thông báo');
        return true;
      } else {
        console.log('Quyền thông báo bị từ chối');
        return false;
      }
    } catch (error) {
      console.error('Lỗi khi xin quyền thông báo:', error);
      return false;
    }
  }

  // Lấy FCM token
  static async getToken() {
    try {
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      return fcmToken;
    } catch (error) {
      console.error('Lỗi khi lấy FCM token:', error);
      return null;
    }
  }

  // Đăng ký thiết bị với server
  static async registerDeviceWithServer(
    apiUrl: string,
    userId: string,
    fcmToken: string,
    authToken?: string
  ) {
    // Gửi token lên server của bạn
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiUrl}/auth/update-fcm-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          fcm_token: fcmToken,
          platform: Platform.OS,
          device_type: Platform.OS === 'ios' ? 'apple' : 'android',
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Đăng ký FCM token thành công:', data);
        return true;
      } else {
        console.error('Lỗi khi đăng ký FCM token:', data);
        return false;
      }
    } catch (error) {
      console.error('Lỗi khi đăng ký thiết bị:', error);
      return false;
    }
  }

  // Hủy đăng ký thiết bị
  static async unregisterDeviceFromServer(
    apiUrl: string,
    userId: string,
    authToken?: string
  ) {
    try {
      const fcmToken = await messaging().getToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiUrl}/api/remove-fcm-token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          fcm_token: fcmToken,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Hủy đăng ký FCM token thành công');
        return true;
      } else {
        console.error('Lỗi khi hủy đăng ký FCM token:', data);
        return false;
      }
    } catch (error) {
      console.error('Lỗi khi hủy đăng ký thiết bị:', error);
      return false;
    }
  }

  // Xử lý thông báo nhận được
  static onMessageReceived(callback: (message: any) => void) {
    return messaging().onMessage(callback);
  }

  // Xử lý khi mở app từ thông báo
  static onNotificationOpened(callback: (message: any) => void) {
    return messaging().onNotificationOpenedApp(callback);
  }

  // Kiểm tra xem app có được mở từ thông báo không
  static async getInitialNotification() {
    return await messaging().getInitialNotification();
  }

  // Đăng ký listener cho token refresh
  static onTokenRefresh(callback: (token: string) => void) {
    return messaging().onTokenRefresh(callback);
  }

  // Xóa FCM token (ví dụ: khi đăng xuất)
  static async deleteToken() {
    try {
      await messaging().deleteToken();
      console.log('FCM token đã được xóa');
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa FCM token:', error);
      return false;
    }
  }
}

export default PushNotificationHelper;
