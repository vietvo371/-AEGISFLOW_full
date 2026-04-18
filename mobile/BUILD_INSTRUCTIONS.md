# 🔧 Hướng Dẫn Build APK - AegisFlow AI

## ✅ Đã Sửa Các Lỗi

### 1. **Lỗi Mapbox Dependencies** ✓
- Đã thêm Mapbox Maven repository vào `android/build.gradle`
- Đã cấu hình MAPBOX_DOWNLOADS_TOKEN trong `android/gradle.properties`

### 2. **Lỗi react-native-screens Deprecated API** ✓
- Đã thêm flag `-Wno-error=deprecated-declarations` trong `android/app/build.gradle`
- Giờ warnings không còn block build nữa

### 3. **Lỗi react-native-vision-camera** ✓
- Tạm thời disable `react-native-vision-camera` do không tương thích với RN 0.81.1
- Đã tạo `react-native.config.js` để exclude vision-camera khỏi build
- QR Scanner feature sẽ cần được fix sau (có thể dùng `react-native-qrcode-scanner` thay thế)

---

## 🚀 Chạy Build Ngay

Mở terminal và chạy:

```bash
cd /Volumes/MAC_OPTION/DATN/AEGISFLOWAI/android
./gradlew clean
./gradlew assembleRelease
```

Hoặc dùng script tự động:

```bash
cd /Volumes/MAC_OPTION/DATN/AEGISFLOWAI
./build-apk.sh
```

---

## 📱 Sau Khi Build Xong

File APK sẽ nằm ở:
```
android/app/build/outputs/apk/release/app-release.apk
```

Hoặc nếu dùng script, sẽ được copy vào:
```
apk-output/AegisFlowAI_[timestamp].apk
```

---

## 🎨 Tạo QR Code Để Chia Sẻ

### Bước 1: Upload APK lên hosting

**Dropbox (Dễ nhất):**
1. Upload file APK lên Dropbox
2. Click "Share" → "Copy link"
3. Đổi `?dl=0` thành `?dl=1` ở cuối URL

**Google Drive:**
1. Upload APK lên Drive
2. Right-click → "Get link" → "Anyone with the link"
3. Copy link

**Firebase Hosting:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

### Bước 2: Tạo trang download với QR Code

```bash
node create-qr-page.js https://your-apk-url.com/AegisFlowAI.apk
```

File HTML sẽ được tạo tại: `apk-output/download-page.html`

### Bước 3: Host trang HTML

**Netlify (Nhanh nhất - 1 phút):**
1. Vào https://app.netlify.com/drop
2. Kéo thả file `download-page.html` vào
3. Nhận link ngay!

**GitHub Pages:**
```bash
git checkout -b gh-pages
cp apk-output/download-page.html index.html
git add index.html
git commit -m "Add APK download page"
git push origin gh-pages
```

Link sẽ là: `https://yourusername.github.io/AegisFlowAI/`

---

## 📤 Chia Sẻ Với Người Dùng

Gửi cho họ link trang download → Họ quét QR code bằng camera → Tải APK → Cài đặt!

---

## 🐛 Nếu Vẫn Gặp Lỗi

### Xóa cache và thử lại:
```bash
cd android
./gradlew clean
rm -rf .gradle
rm -rf app/build
./gradlew assembleRelease
```

### Hoặc build cho architecture cụ thể (APK nhỏ hơn):
```bash
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

---

**Chúc bạn build thành công! 🎉**
