import PushNotificationHelper from '../utils/PushNotificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './authService';

const FCM_TOKEN_KEY = '@fcm_token';

class NotificationTokenService {
  /**
   * Lưu FCM token vào AsyncStorage
   */
  static async saveFCMToken(token: string) {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      console.log('FCM token đã được lưu vào AsyncStorage');
    } catch (error) {
      console.error('Lỗi khi lưu FCM token:', error);
    }
  }

  /**
   * Lấy FCM token từ AsyncStorage
   */
  static async getSavedFCMToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Lỗi khi lấy FCM token từ AsyncStorage:', error);
      return null;
    }
  }

  /**
   * Xóa FCM token khỏi AsyncStorage
   */
  static async clearFCMToken() {
    try {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      console.log('FCM token đã được xóa khỏi AsyncStorage');
    } catch (error) {
      console.error('Lỗi khi xóa FCM token:', error);
    }
  }

  /**
   * Đăng ký FCM token với server khi user đăng nhập
   * Sử dụng authService.updateFcmToken có sẵn
   */
  static async registerTokenAfterLogin() {
    try {
      // Kiểm tra quyền thông báo
      const hasPermission = await PushNotificationHelper.checkPermission();
      
      if (!hasPermission) {
        console.log('Chưa có quyền thông báo, yêu cầu quyền...');
        const granted = await PushNotificationHelper.requestPermission();
        
        if (!granted) {
          console.log('Người dùng từ chối quyền thông báo');
          return false;
        }
      }

      // Lấy FCM token
      const fcmToken = await PushNotificationHelper.getToken();
      
      if (!fcmToken) {
        console.error('Không thể lấy FCM token');
        return false;
      }

      // Lưu token vào AsyncStorage
      await this.saveFCMToken(fcmToken);
 
       // Gửi token lên server nếu đã đăng nhập
       await this.syncTokenWithServer(fcmToken);
       
       return true;
     } catch (error) {
       console.error('❌ Lỗi nghiêm trọng trong quá trình đăng ký FCM token:', error);
       return false;
     }
   }
 
   /**
    * Đồng bộ FCM token với server chỉ khi người dùng đã đăng nhập
    */
   static async syncTokenWithServer(fcmToken: string) {
     try {
       // Kiểm tra xem đã có login token chưa
       const loginToken = await authService.getToken();
       if (!loginToken) {
         console.log('ℹ️ Người dùng chưa đăng nhập, bỏ qua đồng bộ FCM token với server');
         return false;
       }
 
       // Gửi token lên server bằng authService - wrap trong try-catch để tránh chặn luồng login
       try {
         await authService.updateFcmToken(fcmToken);
         console.log('✅ Đã đăng ký FCM token thành công với server');
         return true;
       } catch (serverError) {
         console.warn('⚠️ Server updateFcmToken error (API may not be ready):', serverError);
         return false;
       }
     } catch (error) {
       console.error('❌ Lỗi khi đồng bộ FCM token với server:', error);
       return false;
     }
   }

  /**
   * Hủy đăng ký FCM token khi user đăng xuất
   */
  static async unregisterTokenAfterLogout() {
    try {
      // Gửi empty token hoặc xóa token trên server
      // Note: Backend requires fcm_token (422 error if empty), so skip this if it fails validation
      // await authService.updateFcmToken('');
      console.log('Bỏ qua đồng bộ token rỗng để tránh lỗi 422 (Server yêu cầu bắt buộc)');

      // Xóa token khỏi Firebase
      await PushNotificationHelper.deleteToken();

      // Xóa token khỏi AsyncStorage
      await this.clearFCMToken();

      return true;
    } catch (error) {
      console.error('Lỗi khi hủy đăng ký FCM token:', error);
      return false;
    }
  }

  /**
   * Cập nhật FCM token khi token bị refresh
   */
  static async updateTokenOnRefresh(newToken: string) {
    try {
      // Lưu token mới vào AsyncStorage
      await this.saveFCMToken(newToken);

      // Gửi token mới lên server bằng authService
      await this.syncTokenWithServer(newToken);
      
      return true;
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật FCM token:', error);
      return false;
    }
  }
}

export default NotificationTokenService;
