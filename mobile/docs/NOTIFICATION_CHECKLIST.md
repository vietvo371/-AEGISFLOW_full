# ✅ Checklist cài đặt Firebase Cloud Messaging

Sử dụng checklist này để đảm bảo bạn đã hoàn thành tất cả các bước cài đặt.

## 📦 Dependencies

- [ ] Đã chạy `yarn install`
- [ ] Đã chạy `cd ios && pod install`
- [ ] Packages `@react-native-firebase/app` và `@react-native-firebase/messaging` đã được cài đặt

## 🔥 Firebase Configuration

### iOS
- [ ] File `GoogleService-Info.plist` đã được tải từ Firebase Console
- [ ] File đã được copy vào `ios/AegisFlowAI/`
- [ ] File đã được thêm vào Xcode project (kéo thả vào Xcode)
- [ ] Checkbox "Copy items if needed" đã được chọn khi thêm vào Xcode

### Android
- [ ] File `google-services.json` đã được tải từ Firebase Console
- [ ] File đã được copy vào `android/app/`
- [ ] File `android/build.gradle` đã có `classpath 'com.google.gms:google-services:4.3.15'`
- [ ] File `android/app/build.gradle` đã có `apply plugin: 'com.google.gms.google-services'`

## 📱 iOS Configuration

### Xcode Settings
- [ ] Đã mở Xcode project (`open ios/AegisFlowAI.xcworkspace`)
- [ ] Đã chọn target `AegisFlowAI`
- [ ] Đã vào tab "Signing & Capabilities"
- [ ] Đã thêm capability "Push Notifications"
- [ ] Đã thêm capability "Background Modes"
- [ ] Đã check "Remote notifications" trong Background Modes

### AppDelegate.swift
- [ ] File đã import `Firebase` và `UserNotifications`
- [ ] `FirebaseApp.configure()` đã được gọi trong `didFinishLaunchingWithOptions`
- [ ] `UNUserNotificationCenter.current().delegate = self` đã được set
- [ ] Đã implement `UNUserNotificationCenterDelegate` methods

### APNs Certificate (Production)
- [ ] Đã tạo APNs certificate trong Apple Developer Portal
- [ ] Đã upload certificate lên Firebase Console
- [ ] Certificate đang active và chưa hết hạn

## 🤖 Android Configuration

### Manifest
- [ ] `AndroidManifest.xml` đã có permission `android.permission.POST_NOTIFICATIONS`
- [ ] Đã có permission `android.permission.INTERNET`
- [ ] Đã thêm Firebase service config (nếu cần custom)

### Build Configuration
- [ ] Google Services plugin đã được apply
- [ ] Project build thành công không có lỗi

## 🔧 Code Integration

### Components
- [ ] File `src/components/NotificationService.tsx` đã tồn tại
- [ ] File `src/utils/PushNotificationHelper.ts` đã tồn tại
- [ ] File `src/services/NotificationTokenService.ts` đã tồn tại

### App.tsx
- [ ] `NotificationService` đã được import
- [ ] `NotificationService` đã được thêm vào component tree
- [ ] Handlers `handleNotification` và `handleNotificationOpened` đã được định nghĩa

### AuthContext
- [ ] Import `NotificationTokenService` và `PushNotificationHelper`
- [ ] FCM token đăng ký trong `signIn()`
- [ ] FCM token hủy đăng ký trong `signOut()`
- [ ] Token refresh listener đã được setup trong useEffect

### authService
- [ ] Method `updateFcmToken()` đã tồn tại
- [ ] Property `apiUrl` đã được export

## 🧪 Testing

### Development Testing
- [ ] App build thành công trên iOS
- [ ] App build thành công trên Android
- [ ] Không có lỗi runtime khi khởi động app
- [ ] Console log hiển thị "FCM Token: ..." khi app khởi động

### Permission Testing
- [ ] iOS: Dialog xin quyền notification hiển thị lần đầu chạy app
- [ ] Android 13+: Dialog xin quyền notification hiển thị
- [ ] Có thể chấp nhận hoặc từ chối quyền
- [ ] App không crash khi từ chối quyền

### Login Flow
- [ ] Đăng nhập thành công
- [ ] Console log hiển thị "FCM token đã được đăng ký thành công"
- [ ] Không có error trong console về FCM token
- [ ] Token được gửi lên server thành công

### Notification Testing
- [ ] **Foreground**: Nhận được thông báo khi app đang mở
- [ ] **Background**: Nhận được thông báo khi app ở background
- [ ] **App Closed**: Nhận được thông báo khi app đã tắt
- [ ] Tap vào notification mở app đúng cách
- [ ] Handler `handleNotificationOpened` được gọi khi mở từ notification

### Token Refresh Testing
- [ ] Token tự động cập nhật khi bị refresh
- [ ] Console log hiển thị "FCM Token đã được làm mới: ..."
- [ ] Token mới được gửi lên server tự động

### Logout Flow
- [ ] Đăng xuất thành công
- [ ] Console log hiển thị "FCM token đã được hủy đăng ký"
- [ ] Token được xóa khỏi AsyncStorage
- [ ] Empty token được gửi lên server

## 🌐 Server Integration

### API Endpoint
- [ ] Server đã implement endpoint `/api/v1/auth/update-fcm-token`
- [ ] Endpoint chấp nhận `push_token` trong request body
- [ ] Endpoint yêu cầu Authorization header
- [ ] Endpoint trả về success response

### Database
- [ ] Database có table/collection lưu FCM tokens
- [ ] Có field lưu `user_id`
- [ ] Có field lưu `fcm_token`
- [ ] Có field lưu `platform` (ios/android)
- [ ] Có field lưu `updated_at`

### Sending Notifications
- [ ] Server có thể gửi notification qua Firebase Admin SDK
- [ ] Test gửi notification từ server thành công
- [ ] Notification payload format đúng
- [ ] Device nhận được notification

## 🚀 Production Checklist

### iOS
- [ ] APNs Production certificate đã được tạo
- [ ] Certificate đã upload lên Firebase Console
- [ ] App đã được archive với Production certificate
- [ ] Test notification trên build Production

### Android
- [ ] App đã được build với release signing config
- [ ] Google Services JSON file đúng cho production
- [ ] Test notification trên build Release
- [ ] Proguard rules đã được cấu hình (nếu enable)

### Monitoring
- [ ] Firebase Analytics đã được setup để track notification events
- [ ] Có logging để monitor FCM token registration
- [ ] Có error tracking cho notification failures
- [ ] Có metrics để đo success rate

## 📚 Documentation

- [ ] Đã đọc `docs/NOTIFICATION_SETUP.md`
- [ ] Đã đọc `NOTIFICATION_INTEGRATION_SUMMARY.md`
- [ ] Đã đọc `docs/ANDROID_NOTIFICATION_CONFIG.md` (nếu làm Android)
- [ ] Team đã được training về notification system

## 🐛 Common Issues Resolved

- [ ] "Default FirebaseApp is not initialized" - Fixed
- [ ] "Push notifications not working on simulator" - Understood (iOS simulator không support)
- [ ] Notification không hiển thị foreground - Fixed (AppDelegate config)
- [ ] Token không gửi lên server - Fixed (authService integration)

---

## ✨ Completion Status

Khi đã check tất cả các mục trên, notification system của bạn đã sẵn sàng!

**Ngày hoàn thành:** ___________

**Người kiểm tra:** ___________

**Ghi chú:**
