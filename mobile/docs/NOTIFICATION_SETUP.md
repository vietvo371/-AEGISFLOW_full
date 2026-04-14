# Hướng dẫn cài đặt và sử dụng Firebase Cloud Messaging (FCM)

## Tổng quan

Dự án CityResQ360 đã được tích hợp Firebase Cloud Messaging để gửi và nhận thông báo push. Tài liệu này hướng dẫn cách cài đặt và sử dụng các tính năng notification.

## Cấu trúc file

```
src/
├── components/
│   └── NotificationService.tsx      # Component chính xử lý notification
├── utils/
│   └── PushNotificationHelper.ts    # Helper functions cho notification
└── services/
    └── NotificationTokenService.ts  # Service quản lý FCM token
```

## Cài đặt

### 1. Cài đặt dependencies

Dependencies đã được thêm vào `package.json`:

```json
"@react-native-firebase/app": "^23.4.1",
"@react-native-firebase/messaging": "^23.4.1"
```

Chạy lệnh để cài đặt:

```bash
yarn install
```

### 2. Cài đặt iOS Pods

```bash
cd ios
pod install
cd ..
```

### 3. Cấu hình Firebase

#### iOS

1. Tải file `GoogleService-Info.plist` từ Firebase Console
2. Copy file vào thư mục `ios/CityResQ360App/`
3. Mở Xcode và kéo file `GoogleService-Info.plist` vào project (đảm bảo checkbox "Copy items if needed" được chọn)

File `GoogleService-Info.plist` đã được thêm vào git status:
```
A ios/GoogleService-Info.plist
```

#### Android

1. Tải file `google-services.json` từ Firebase Console
2. Copy file vào thư mục `android/app/`

### 4. Cấu hình Xcode

File `AppDelegate.swift` đã được cập nhật để:
- Import Firebase và UserNotifications
- Cấu hình Firebase khi app khởi động
- Xử lý thông báo ở foreground và background
- Đăng ký remote notifications

### 5. Cấu hình Capabilities (iOS)

Mở Xcode project và bật các capabilities sau:

1. **Push Notifications**:
   - Chọn target CityResQ360App
   - Tab "Signing & Capabilities"
   - Click "+ Capability"
   - Thêm "Push Notifications"

2. **Background Modes**:
   - Thêm "Background Modes" capability
   - Chọn "Remote notifications"

File `CityResQ360App.entitlements` đã được tạo với Push Notifications enabled.

## Sử dụng

### 1. NotificationService Component

Component này đã được tích hợp vào `App.tsx` và tự động:
- Xin quyền thông báo khi app khởi động
- Lấy FCM token
- Xử lý thông báo khi app ở foreground
- Xử lý khi người dùng mở app từ thông báo

```typescript
<NotificationService
  onNotification={handleNotification}
  onNotificationOpened={handleNotificationOpened}
/>
```

### 2. Tự động đăng ký FCM Token

**FCM token được tự động quản lý trong `AuthContext`:**

Khi người dùng đăng nhập thành công:
- FCM token tự động được lấy từ Firebase
- Token được gửi lên server thông qua `authService.updateFcmToken()`
- Token được lưu vào AsyncStorage

Khi người dùng đăng xuất:
- FCM token tự động bị xóa khỏi server
- Token bị xóa khỏi Firebase
- Token bị xóa khỏi AsyncStorage

Khi FCM token bị refresh:
- Token mới tự động được cập nhật lên server
- Token mới được lưu vào AsyncStorage

**Bạn không cần làm gì thêm!** Tất cả đã được tích hợp sẵn trong AuthContext.

### 3. Sử dụng thủ công (nếu cần)

Nếu bạn cần kiểm soát thủ công, bạn có thể sử dụng `NotificationTokenService`:

```typescript
import NotificationTokenService from './src/services/NotificationTokenService';

// Đăng ký token (authService.updateFcmToken sẽ được gọi tự động)
await NotificationTokenService.registerTokenAfterLogin();

// Hủy đăng ký token
await NotificationTokenService.unregisterTokenAfterLogout();

// Cập nhật token mới
await NotificationTokenService.updateTokenOnRefresh(newToken);
```

### 5. Sử dụng PushNotificationHelper trực tiếp

Nếu bạn muốn kiểm soát thủ công:

```typescript
import PushNotificationHelper from './src/utils/PushNotificationHelper';

// Kiểm tra quyền
const hasPermission = await PushNotificationHelper.checkPermission();

// Xin quyền
const granted = await PushNotificationHelper.requestPermission();

// Lấy FCM token
const token = await PushNotificationHelper.getToken();

// Đăng ký với server
await PushNotificationHelper.registerDeviceWithServer(
  'https://api.example.com',
  'user123',
  token,
  'auth_token'
);

// Xóa token khi đăng xuất
await PushNotificationHelper.deleteToken();
```

## API Server Endpoint

Server của bạn cần implement endpoint sau (đã có sẵn trong authService):

### Cập nhật FCM Token

```
POST /api/v1/auth/update-fcm-token
Content-Type: application/json
Authorization: Bearer {auth_token}

{
  "push_token": "string"  // FCM token hoặc empty string để xóa
}

Response:
{
  "success": true,
  "message": "FCM token updated successfully"
}
```

**Lưu ý:** Endpoint này đã được implement trong `authService.updateFcmToken()` và được gọi tự động khi:
- Người dùng đăng nhập (gửi token)
- FCM token bị refresh (cập nhật token mới)
- Người dùng đăng xuất (gửi empty string để xóa token)

## Gửi thông báo từ server

Sử dụng Firebase Admin SDK để gửi thông báo:

```javascript
// Node.js example
const admin = require('firebase-admin');

await admin.messaging().send({
  token: fcmToken,
  notification: {
    title: 'Tiêu đề thông báo',
    body: 'Nội dung thông báo'
  },
  data: {
    type: 'alert',
    alertId: '123',
    // Custom data
  }
});
```

## Testing

### Test trên iOS

1. Build app trên thiết bị thật (Push notifications không hoạt động trên simulator)
2. Chấp nhận quyền thông báo khi được hỏi
3. Kiểm tra Console log để xem FCM token
4. Gửi test notification từ Firebase Console

### Debug

Kiểm tra logs:

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

Các log quan trọng:
- "FCM Token: ..." - Token đã được lấy thành công
- "Đã được cấp quyền thông báo" - Quyền đã được cấp
- "Thông báo nhận được..." - Thông báo đã được nhận

## Troubleshooting

### iOS không nhận được thông báo

1. Kiểm tra Push Notifications capability đã được bật
2. Kiểm tra APNs certificate trong Firebase Console
3. Kiểm tra provisioning profile có Push Notifications enabled
4. Đảm bảo test trên thiết bị thật, không phải simulator

### Token không được gửi lên server

1. Kiểm tra network connection
2. Kiểm tra API endpoint URL
3. Kiểm tra response từ server trong Network Inspector
4. Kiểm tra auth token có hợp lệ

### Thông báo không hiển thị khi app ở foreground

Đã được xử lý trong `AppDelegate.swift`:
```swift
completionHandler([[.banner, .sound, .badge]])
```

## Tham khảo

- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [iOS Push Notifications](https://developer.apple.com/documentation/usernotifications)
