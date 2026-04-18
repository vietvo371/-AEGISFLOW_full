# 🔔 Firebase Cloud Messaging Integration

## Quick Start

### 1. Cài đặt (30 giây)
```bash
yarn install
cd ios && pod install && cd ..
```

### 2. Cấu hình Firebase (5 phút)
- iOS: Copy `GoogleService-Info.plist` vào `ios/AegisFlowAI/`
- Android: Copy `google-services.json` vào `android/app/`

### 3. Xcode Setup (2 phút)
- Mở `ios/AegisFlowAI.xcworkspace`
- Bật "Push Notifications" capability
- Bật "Background Modes" > "Remote notifications"

### 4. Chạy!
```bash
yarn ios
# hoặc
yarn android
```

## ✨ Tính năng

✅ **Tự động hoàn toàn** - Không cần code thêm!
- FCM token tự động đăng ký khi login
- Token tự động cập nhật khi refresh
- Token tự động xóa khi logout

✅ **Đầy đủ chức năng**
- Nhận notification foreground/background/closed
- Xử lý khi người dùng tap notification
- Xin quyền thông báo tự động
- Lưu trữ token trong AsyncStorage

✅ **Production ready**
- Error handling đầy đủ
- Logging chi tiết
- Server integration sẵn sàng
- Support cả iOS và Android

## 📁 File Structure

```
src/
├── components/
│   └── NotificationService.tsx      # Main notification handler
├── utils/
│   └── PushNotificationHelper.ts    # Helper functions
└── services/
    └── NotificationTokenService.ts  # Token management
```

## 🔧 Cách sử dụng

### Tự động (Recommended)

Tất cả đã được tích hợp sẵn! Khi user login/logout, FCM token tự động được quản lý.

### Thủ công (Nếu cần)

```typescript
import PushNotificationHelper from './src/utils/PushNotificationHelper';

// Lấy token
const token = await PushNotificationHelper.getToken();

// Xin quyền
const granted = await PushNotificationHelper.requestPermission();

// Kiểm tra quyền
const hasPermission = await PushNotificationHelper.checkPermission();
```

## 📡 Server API

Endpoint đã có sẵn trong `authService`:

```typescript
POST /api/v1/auth/update-fcm-token
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "push_token": "fcm_token_string"
}
```

## 🧪 Testing

```bash
# 1. Chạy app
yarn ios

# 2. Login vào app

# 3. Copy FCM token từ console log

# 4. Test từ Firebase Console:
#    - Vào Cloud Messaging
#    - Click "Send your first message"
#    - Paste token vào "Add an FCM registration token"
#    - Send!
```

## 📚 Tài liệu chi tiết

| File | Mô tả |
|------|-------|
| [NOTIFICATION_SETUP.md](./NOTIFICATION_SETUP.md) | Hướng dẫn chi tiết đầy đủ |
| [ANDROID_NOTIFICATION_CONFIG.md](./ANDROID_NOTIFICATION_CONFIG.md) | Cấu hình Android |
| [../NOTIFICATION_INTEGRATION_SUMMARY.md](../NOTIFICATION_INTEGRATION_SUMMARY.md) | Tóm tắt tích hợp |
| [../NOTIFICATION_CHECKLIST.md](../NOTIFICATION_CHECKLIST.md) | Checklist kiểm tra |

## 🐛 Troubleshooting

### iOS không nhận notification
- ✅ Test trên thiết bị thật (simulator không support)
- ✅ Kiểm tra Push Notifications capability đã bật
- ✅ Kiểm tra APNs certificate trong Firebase Console

### Android không nhận notification
- ✅ Kiểm tra `google-services.json` đã copy đúng
- ✅ Kiểm tra Google Play Services đã cài đặt
- ✅ Kiểm tra app có quyền notification

### Token không gửi lên server
- ✅ Kiểm tra internet connection
- ✅ Kiểm tra auth token còn hợp lệ
- ✅ Kiểm tra endpoint `/api/v1/auth/update-fcm-token` hoạt động

### Notification không hiển thị foreground
- ✅ Đã fix trong `AppDelegate.swift`
- ✅ Rebuild app nếu vẫn không hoạt động

## 💡 Tips

1. **Development**: Test trên thiết bị thật để đảm bảo notification hoạt động
2. **Logging**: Theo dõi console log để xem FCM token và notification events
3. **Firebase Console**: Sử dụng để test gửi notification nhanh chóng
4. **Token Refresh**: Token có thể thay đổi, server nên cập nhật khi nhận token mới

## 🎉 That's it!

Notification system đã sẵn sàng! Chỉ cần cấu hình Firebase và bạn có thể bắt đầu gửi notifications.

---

**Need help?** Check the full documentation in [NOTIFICATION_SETUP.md](./NOTIFICATION_SETUP.md)
