# Cấu hình Firebase Cloud Messaging cho Android

## 1. Thêm Google Services Plugin

Kiểm tra file `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // Thêm dòng này nếu chưa có
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

## 2. Apply Google Services Plugin

Kiểm tra file `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'
// Thêm dòng này ở cuối file
apply plugin: 'com.google.gms.google-services'
```

## 3. Thêm Firebase Dependencies

File `android/app/build.gradle` - trong phần `dependencies`:

```gradle
dependencies {
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    
    // ... các dependencies khác
}
```

**Lưu ý:** React Native Firebase sẽ tự động thêm các dependencies cần thiết, nhưng bạn có thể cần thêm thủ công nếu gặp lỗi.

## 4. Cấu hình AndroidManifest.xml

File `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <application>
        <!-- ... các config khác ... -->
        
        <!-- Firebase Cloud Messaging -->
        <service
            android:name=".MyFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        
        <!-- Notification channel (Android 8+) -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/notification_color" />
    </application>
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
</manifest>
```

## 5. Tạo FirebaseMessagingService (Optional)

Tạo file `android/app/src/main/java/com/cityresq360app/MyFirebaseMessagingService.kt`:

```kotlin
package com.cityresq360app

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.util.Log

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "From: ${remoteMessage.from}")
        
        // Kiểm tra nếu message chứa data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
        }
        
        // Kiểm tra nếu message chứa notification payload
        remoteMessage.notification?.let {
            Log.d(TAG, "Message Notification Body: ${it.body}")
        }
    }
    
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Refreshed token: $token")
        
        // Gửi token mới lên server nếu cần
        // sendRegistrationToServer(token)
    }
    
    companion object {
        private const val TAG = "FCMService"
    }
}
```

## 6. Thêm google-services.json

1. Tải file `google-services.json` từ Firebase Console
2. Copy file vào `android/app/`
3. Đảm bảo file không bị ignore trong `.gitignore`

## 7. Cấu hình Notification Icons

Tạo file `android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="notification_color">#4CAF50</color>
</resources>
```

## 8. Build và Test

```bash
# Clean build
cd android
./gradlew clean

# Build debug
./gradlew assembleDebug

# Hoặc chạy trực tiếp
cd ..
yarn android
```

## 9. Xin quyền thông báo (Android 13+)

Android 13 trở lên yêu cầu runtime permission cho notifications. Code đã được xử lý trong `NotificationService.tsx`:

```typescript
// Tự động xin quyền khi app khởi động
const granted = await PushNotificationHelper.requestPermission();
```

## Troubleshooting

### Lỗi: "Default FirebaseApp is not initialized"

Giải pháp:
1. Kiểm tra file `google-services.json` đã được copy đúng vị trí
2. Kiểm tra `apply plugin: 'com.google.gms.google-services'` đã được thêm
3. Clean và rebuild project

### Lỗi: "Failed to resolve: com.google.firebase"

Giải pháp:
1. Kiểm tra internet connection
2. Sync gradle files trong Android Studio
3. Xóa thư mục `.gradle` và rebuild

### Notification không hiển thị

Kiểm tra:
1. App có quyền notification trong Settings
2. Notification channel đã được tạo (Android 8+)
3. Kiểm tra logs để xem notification có được nhận không

### Token không được lấy

Kiểm tra:
1. Google Play Services đã được cài đặt trên thiết bị
2. Internet connection
3. File `google-services.json` đúng với package name của app

## Test Notification

### 1. Test từ Firebase Console

1. Mở Firebase Console
2. Vào Cloud Messaging
3. Click "Send your first message"
4. Nhập title và message
5. Chọn target app
6. Click Send

### 2. Test từ Terminal

```bash
# Lấy FCM token từ app logs
# Copy token và chạy:

curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test message"
    },
    "data": {
      "type": "test"
    }
  }'
```

## Xem logs

```bash
# Xem logs Android
yarn android
# Trong terminal khác:
adb logcat | grep -i firebase
```

## Tham khảo

- [React Native Firebase - Cloud Messaging](https://rnfirebase.io/messaging/usage)
- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Android Notifications](https://developer.android.com/develop/ui/views/notifications)
