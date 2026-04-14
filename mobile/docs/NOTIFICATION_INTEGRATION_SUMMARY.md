# Tóm tắt tích hợp Firebase Cloud Messaging (FCM)

## Các file đã thêm/cập nhật

### Files mới được tạo:

1. **src/components/NotificationService.tsx**
   - Component xử lý notification lifecycle
   - Tự động xin quyền thông báo
   - Lấy và quản lý FCM token
   - Xử lý thông báo foreground/background
   - Xử lý khi app được mở từ thông báo

2. **src/utils/PushNotificationHelper.ts**
   - Helper functions cho notification
   - Kiểm tra và xin quyền thông báo
   - Lấy FCM token
   - Các utility functions khác

3. **src/services/NotificationTokenService.ts**
   - Service quản lý FCM token
   - Tự động đăng ký/hủy đăng ký token với server
   - Lưu trữ token trong AsyncStorage
   - Xử lý token refresh

4. **docs/NOTIFICATION_SETUP.md**
   - Hướng dẫn chi tiết cài đặt và sử dụng
   - Cấu hình iOS và Android
   - API endpoints
   - Troubleshooting

### Files đã cập nhật:

1. **package.json**
   - Thêm `@react-native-firebase/app`: ^23.4.1
   - Thêm `@react-native-firebase/messaging`: ^23.4.1

2. **App.tsx**
   - Import NotificationService
   - Thêm handlers cho notification
   - Tích hợp NotificationService vào app tree

3. **ios/CityResQ360App/AppDelegate.swift**
   - Import Firebase và UserNotifications
   - Cấu hình Firebase khi app khởi động
   - Implement UNUserNotificationCenterDelegate
   - Xử lý thông báo foreground/background
   - Đăng ký remote notifications

4. **src/contexts/AuthContext.tsx**
   - Import NotificationTokenService và PushNotificationHelper
   - Tự động đăng ký FCM token khi đăng nhập
   - Tự động hủy đăng ký FCM token khi đăng xuất
   - Tự động cập nhật token khi bị refresh

5. **src/services/authService.ts**
   - Thêm apiUrl property
   - Sử dụng method updateFcmToken có sẵn

6. **src/utils/Api.tsx**
   - Export API_BASE_URL để sử dụng trong services khác

## Cách hoạt động

### 1. Khi app khởi động:
- `NotificationService` được mount trong `App.tsx`
- Tự động xin quyền thông báo (iOS)
- Lấy FCM token từ Firebase
- Đăng ký các event listeners

### 2. Khi user đăng nhập:
- `AuthContext.signIn()` được gọi
- Sau khi đăng nhập thành công:
  - `NotificationTokenService.registerTokenAfterLogin()` được gọi
  - FCM token được gửi lên server qua `authService.updateFcmToken()`
  - Token được lưu vào AsyncStorage

### 3. Khi nhận thông báo:
- **Foreground**: Alert hiển thị trong app
- **Background**: System notification hiển thị
- **App đã tắt**: System notification hiển thị

### 4. Khi user mở thông báo:
- `handleNotificationOpened()` được gọi trong `App.tsx`
- Có thể điều hướng đến màn hình cụ thể

### 5. Khi FCM token bị refresh:
- Listener trong `AuthContext` được trigger
- `NotificationTokenService.updateTokenOnRefresh()` được gọi
- Token mới được gửi lên server tự động

### 6. Khi user đăng xuất:
- `AuthContext.signOut()` được gọi
- `NotificationTokenService.unregisterTokenAfterLogout()` được gọi
- Empty string được gửi lên server để xóa token
- Token bị xóa khỏi Firebase và AsyncStorage

## API Endpoint

Server cần xử lý endpoint sau:

```
POST /api/v1/auth/update-fcm-token
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "push_token": "fcm_token_here" // hoặc "" để xóa
}
```

## Cài đặt

### 1. Install dependencies:
```bash
yarn install
cd ios && pod install && cd ..
```

### 2. Cấu hình Firebase:
- iOS: Copy `GoogleService-Info.plist` vào `ios/CityResQ360App/`
- Android: Copy `google-services.json` vào `android/app/`

### 3. Xcode Configuration:
- Mở Xcode project
- Bật "Push Notifications" capability
- Bật "Background Modes" > "Remote notifications"

### 4. Test:
```bash
# iOS
yarn ios

# Android
yarn android
```

## Kiểm tra

1. Chạy app và login
2. Kiểm tra console log để thấy FCM token
3. Copy token và test gửi notification từ Firebase Console
4. Verify notification được nhận trong các trạng thái:
   - App đang mở (foreground)
   - App ở background
   - App đã tắt

## Lưu ý quan trọng

- ✅ Tất cả logic FCM token đã được tích hợp tự động
- ✅ Không cần code thêm cho việc đăng ký/hủy đăng ký token
- ✅ Token tự động cập nhật khi bị refresh
- ⚠️ Push notifications chỉ hoạt động trên thiết bị thật (iOS)
- ⚠️ Cần cấu hình APNs certificate trong Firebase Console cho iOS
- ⚠️ File `GoogleService-Info.plist` đã được add vào git

## Troubleshooting

Xem file `docs/NOTIFICATION_SETUP.md` để biết thêm chi tiết về:
- Cấu hình chi tiết
- Xử lý lỗi thường gặp
- Testing và debugging
- API reference
