# ⚠️ Known Issues - AegisFlow AI

## 🚧 Tạm Thời Disable Features

### react-native-vision-camera

**Vấn đề:**
- `react-native-vision-camera` version 4.7.1 không tương thích hoàn toàn với React Native 0.81.1
- Gây lỗi compilation khi build Android release

**Giải pháp tạm thời:**
- Đã disable vision-camera trong build (xem `react-native.config.js`)
- QRScanner component đã được comment tạm thời

**Cách sửa vĩnh viễn:**

#### Option 1: Dùng react-native-qrcode-scanner (Khuyên dùng)
Bạn đã có package này rồi, chỉ cần refactor `QRScanner.tsx`:

```bash
# Package đã có trong package.json
# Chỉ cần refactor component
```

#### Option 2: Update vision-camera
```bash
# Update lên version mới hơn tương thích với RN 0.81
npm install react-native-vision-camera@latest
cd ios && pod install
```

#### Option 3: Downgrade React Native
```bash
# Downgrade về RN 0.76 (version tương thích tốt hơn)
npm install react-native@0.76.0
```

---

## 📝 Sau Khi Build APK

Nếu muốn enable lại QR Scanner:

1. **Xóa file** `react-native.config.js`
2. **Uncomment code** trong `src/component/QRScanner.tsx`  
3. **Refactor** sang dùng `react-native-qrcode-scanner`:

```tsx
import QRCodeScanner from 'react-native-qrcode-scanner';

// ... component code
<QRCodeScanner
  onRead={({ data }) => onScan(data)}
  topContent={...}
  bottomContent={...}
/>
```

4. **Rebuild** app

---

## ✅ Build APK Thành Công

Các tính năng khác vẫn hoạt động bình thường:
- ✓ Maps (Mapbox)
- ✓ Firebase Messaging
- ✓ Navigation
- ✓ UI Components
- ⚠️ QR Scanner (tạm thời disable)

---

**Note:** Đây chỉ là giải pháp tạm thời để có thể build APK ngay. Bạn nên fix vision-camera sau hoặc chuyển sang dùng thư viện khác.
