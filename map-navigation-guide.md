# 🗺️ Hướng Dẫn Hệ Thống Bản Đồ & Chỉ Đường (Map Navigation)

> Tài liệu này mô tả toàn bộ hệ thống bản đồ và chỉ đường trong ứng dụng iOS React Native (FoodVip).

---

## 📦 Thư Viện & Dịch Vụ Sử Dụng

| Thư viện / Dịch vụ | Mục đích |
|---|---|
| `ndamap-gl` (MapLibre-based) | Render bản đồ trong WebView |
| `maplibre-gl@3.6.2` | Render bản đồ trang RestaurantMap |
| `openmap.vn` (NDAMaps) | Tile bản đồ Việt Nam, Geocoding API |
| `OSRM` (`router.project-osrm.org`) | Routing API - tính toán đường đi |
| `react-native-webview` | Nhúng bản đồ HTML vào app native |
| `react-native-geolocation-service` | Lấy GPS thiết bị thật |
| Laravel Echo / WebSocket | Cập nhật vị trí shipper real-time |

---

## ⚙️ Cấu Hình Bản Đồ

**File:** [`src/config/mapbox.ts`](../src/config/mapbox.ts)

```typescript
export const NDA_API_KEY = '6TTIZbUWJmRMSpiYzQ0YY8z5v8wv43w0';
export const NDA_MAP_STYLE = 'https://tiles.openmap.vn/styles/day-v1/style.json';
export const NDA_BASE_URL = 'https://mapapis.openmap.vn/v1';

// Forward Geocoding: địa chỉ → tọa độ
export const ndaGeocodeURL = (query: string) =>
  `${NDA_BASE_URL}/geocode/forward?text=${encodeURIComponent(query)}&apikey=${NDA_API_KEY}`;

// Routing API: tạo URL chỉ đường giữa 2 điểm
// ⚠️ API nhận origin/destination theo dạng lat,lng (không phải lng,lat)
export const ndaDirectionsURL = (p1: [number, number], p2: [number, number]) =>
  `${NDA_BASE_URL}/direction?origin=${p1[1]},${p1[0]}&destination=${p2[1]},${p2[0]}&vehicle=car&apikey=${NDA_API_KEY}`;
```

> **Lưu ý quan trọng:** Toàn bộ ứng dụng dùng convention `[longitude, latitude]` (lng trước), nhưng khi gọi NDA Directions API thì truyền `lat,lng` (đảo ngược).

---

## 📂 Các Component Bản Đồ

### 1. `DeliveryMapModal` — Bản đồ chỉ đường toàn màn hình (Shipper)

**File:** [`src/components/DeliveryMapModal.tsx`](../src/components/DeliveryMapModal.tsx)

Hiển thị bản đồ chỉ đường dạng **modal toàn màn hình** với giao diện navigation giống Google Maps. Dành cho **shipper** khi cần xem đường giao hàng chi tiết.

#### Props

```typescript
interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: "restaurant" | "dual_address" | "three_point" | "shipper_to_customer" | "shipper_delivery";
  destAddress: string;         // Địa chỉ điểm đến (text)
  destName?: string;           // Tên điểm đến
  destCoord?: [number, number] | null;       // [lng, lat] điểm đến
  secondAddress?: string;      // Địa chỉ thứ hai (nếu có)
  secondName?: string;
  secondCoord?: [number, number] | null;     // [lng, lat] điểm thứ hai
  shipperAddress?: string;
  shipperName?: string;
  shipperCoord?: [number, number] | null;    // [lng, lat] vị trí shipper
  restaurantCoord?: [number, number] | null; // [lng, lat] vị trí quán ăn
}
```

#### Tính năng giao diện

| Phần UI | Mô tả |
|---|---|
| **Nav Banner (top)** | Hiển thị bước hiện tại (icon + tên đường + khoảng cách) + bước tiếp theo |
| **Bottom Bar** | ETA (phút), tổng khoảng cách, giờ dự kiến đến, danh sách các bước |
| **Recenter Button** | Nút 🎯 — quay camera về vị trí shipper |
| **Steps List** | Danh sách bước chỉ đường có thể mở/thu (expandable) |
| **Header** | Tiêu đề "Chỉ đường giao hàng" + nút Refresh GPS + nút Đóng |

#### Luồng hoạt động GPS

```
1. WebView load xong
   ├── Nếu có shipperCoord từ server → inject ngay vào map
   └── Song song: Bắt đầu lấy GPS thiết bị

2. GPS lấy vị trí thật (getCurrentPosition, timeout 5s)
   ├── Hợp lệ (trong Việt Nam lat 8-23.5, lng 102-110) → dùng GPS thật
   └── Ngoài Việt Nam (Simulator default) → fallback về server coord

3. watchPosition (cập nhật real-time)
   ├── distanceFilter: 5m (chỉ update khi di chuyển >5m)
   ├── interval: 3000ms
   └── fastestInterval: 2000ms

4. Khi WebSocket push tọa độ mới → inject qua shipperCoord prop → WebView update
```

#### Cách route OSRM hoạt động

```javascript
// Gọi OSRM với alternatives=3 → chọn route ngắn nhất
fetch(`https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}
       ?overview=full&geometries=geojson&steps=true&alternatives=3`)

// Response được xử lý:
// - Vẽ route lên map (màu xanh #2563eb, outline trắng)
// - Cập nhật NavUI: danh sách steps, ETA, khoảng cách
// - Tự động xoay camera theo hướng đi
```

#### Biểu tượng chỉ đường

```
🚗 depart       ⬅️ turn-left      ➡️ turn-right
↩️ sharp-left   ↪️ sharp-right    ↖️ slight-left
↗️ slight-right  ⬆️ straight      🔄 uturn/roundabout
🔀 fork/merge   ⬆️ on-ramp       ↘️ off-ramp
🛑 end-of-road  🏁 arrive
```

---

### 2. `InlineDeliveryMap` — Bản đồ nhúng trực tiếp (Khách hàng)

**File:** [`src/components/InlineDeliveryMap.tsx`](../src/components/InlineDeliveryMap.tsx)

Hiển thị bản đồ **nhúng trực tiếp** trong màn hình theo dõi đơn hàng của khách hàng. Tự động chọn chế độ hiển thị theo trạng thái đơn.

#### Props

```typescript
interface Props {
  mode: "dual_address" | "three_point" | "shipper_to_customer";
  destAddress: string;         // Địa chỉ quán ăn
  destName: string;
  destCoord?: [number, number] | null;       // [lng, lat] quán ăn
  secondAddress?: string;      // Địa chỉ khách hàng
  secondName?: string;
  secondCoord?: [number, number] | null;     // [lng, lat] khách hàng
  shipperAddress?: string;     // Dùng khi geocode vị trí shipper
  shipperName?: string;
  shipperCoord?: [number, number] | null;    // [lng, lat] GPS shipper thật
  height?: number;             // Chiều cao map (mặc định: 42% vh)
}
```

#### Ba chế độ hiển thị (mode)

| Mode | Trạng thái đơn | Hiển thị |
|---|---|---|
| `dual_address` | `tinh_trang ≤ 2` (Chờ/Đã nhận/Đang làm) | 🏪 Quán → 📍 Khách |
| `three_point` | `tinh_trang = 1` (Đã nhận - đang đến quán) | 🏪 Quán + 🔴 Shipper + 📍 Khách |
| `shipper_to_customer` | `tinh_trang = 2` (Đang giao) | 🔴 Shipper → 📍 Khách |

#### Tối ưu hiệu năng

- **`useMemo`**: HTML bản đồ chỉ rebuild khi các thông tin tĩnh thay đổi (không rebuild khi `shipperCoord` update)
- **`injectJavaScript`**: Khi shipper di chuyển → chỉ gọi `window.updateShipperLocation(lng, lat)` để cập nhật marker, **không reload toàn bộ WebView**

```typescript
// Chỉ build lại HTML khi thông tin tĩnh thay đổi
const html = useMemo(() => {
  return buildHTML(mode, destAddress, destName, ...);
}, [mode, destAddress, destName, ...]);  // ← shipperCoord KHÔNG có trong deps

// Cập nhật shipper real-time qua JS injection
useEffect(() => {
  if (shipperCoord && webViewRef.current) {
    webViewRef.current.injectJavaScript(`
      window.updateShipperLocation(${shipperCoord[0]}, ${shipperCoord[1]});
      true;
    `);
  }
}, [shipperCoord]);
```

---

### 3. `RestaurantMap` — Bản đồ tìm quán ăn

**File:** [`src/pages/Clients/RestaurantMap.tsx`](../src/pages/Clients/RestaurantMap.tsx)

Trang bản đồ hiển thị **tất cả quán ăn** gần vị trí người dùng.

#### Tính năng

- Hiển thị vị trí người dùng (marker xanh 🔵)
- Hiển thị tất cả quán ăn dưới dạng marker đỏ 🏪
- Click vào marker quán → popup hiển thị: ảnh, tên quán, địa chỉ, nút "Xem chi tiết"
- Click "Xem chi tiết" → navigate đến màn hình `RestaurantDetail`

#### Dữ liệu

```typescript
// API lấy danh sách quán ăn kèm tọa độ (truyền vị trí user để sắp xếp gần nhất)
GET /khach-hang/quan-an/map?lat={lat}&lng={lng}
// Response: { data: [{ id, ten_quan_an, dia_chi, hinh_anh, toa_do_x, toa_do_y }] }
```

> **Lưu ý:** Field `toa_do_x` lưu latitude, `toa_do_y` lưu longitude (có thể bị đảo trong DB — xem phần Auto-fix).

---

## 🔧 Kỹ Thuật Quan Trọng

### Auto-fix Tọa độ Bị Đảo

Do dữ liệu trong DB đôi khi lưu lat/lng bị hoán đổi, tất cả các component đều có hàm `autoFixCoord` để tự sửa:

```javascript
function autoFixCoord(c) {
  if (!c || !Array.isArray(c) || c.length < 2) return c;
  var lng = c[0], lat = c[1];
  // Nếu đúng thứ tự [lng, lat] cho vùng Đà Nẵng
  if (lat >= 15.8 && lat <= 16.3 && lng >= 107.5 && lng <= 108.5) return c;
  // Nếu bị đảo → swap lại
  if (lng >= 15.8 && lng <= 16.3 && lat >= 107.5 && lat <= 108.5) return [lat, lng];
  return c;
}
```

### Geocoding (Địa chỉ → Tọa độ)

Khi không có sẵn tọa độ, hệ thống geocode qua NDAMaps API:

```javascript
// Tự động thêm ", Đà Nẵng" nếu query chưa có
function geocodeNDA(query, callback) {
  var q = query.toLowerCase().includes('nẵng') ? query : query + ', Đà Nẵng';
  var url = 'https://mapapis.openmap.vn/v1/geocode/forward?text=' 
            + encodeURIComponent(q) + '&apikey=' + TOKEN;
  fetch(url).then(...);
}

// Thử 2 lần: lần 1 tên đầy đủ, lần 2 chỉ tên đường đầu tiên
function geocodeAddr(addr, callback, nameHint) {
  var fullQuery = nameHint ? (nameHint + ' ' + addr) : addr;
  geocodeNDA(fullQuery, function(lng, lat) {
    if (lng !== null) { callback(lng, lat); return; }
    // Fallback: chỉ lấy phần tên đường đầu tiên
    var street = addr.split(',')[0].trim();
    geocodeNDA(nameHint + ' ' + street + ' Đà Nẵng', callback);
  });
}
```

### Kiểm tra GPS Hợp Lệ

```javascript
// Tránh dùng tọa độ mặc định của iOS Simulator (San Francisco)
const isInVietnam = (lat, lng) => {
  return lat >= 8.0 && lat <= 23.5 && lng >= 102.0 && lng <= 110.0;
};

// Kiểm tra tọa độ có hợp lệ không
function isValidCoord(c) {
  if (!c || !Array.isArray(c) || c.length < 2) return false;
  if (isNaN(c[0]) || isNaN(c[1])) return false;
  if (c[0] === 0 && c[1] === 0) return false;
  return c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90;
}
```

### Xin Quyền Location

**File:** [`src/utils/location.ts`](../src/utils/location.ts)

```typescript
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    if (status === 'denied') {
      // Hiện alert hướng dẫn vào Settings > FoodVip > Vị trí
      Alert.alert('Cần quyền vị trí', '...', [
        { text: 'Huỷ' },
        { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
      ]);
    }
    return status === 'granted';
  }
  // Android: dùng PermissionsAndroid
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, { ... }
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};
```

---

## 🔄 Real-time Tracking Qua WebSocket

Vị trí shipper được cập nhật real-time qua **Laravel Echo** (WebSocket):

```typescript
// Khách hàng lắng nghe kênh private của đơn hàng
connectEcho().then((echo) => {
  echo.private(`order.${orderDetail.id}`)
    .listen(".shipper.location.updated", (data) => {
      if (data?.lat && data?.lng) {
        // Cập nhật state shipperCoord → InlineDeliveryMap tự update qua useEffect
        setShipperCoord([parseFloat(data.lng), parseFloat(data.lat)]);
      }
    });
});

// Shipper lắng nghe kênh private của mình
echo.private(`shipper.${shipperId}`)
  .listen(".dispatch.candidate", (data) => { /* Đơn hàng mới */ })
  .listen(".dispatch.cancelled", (data) => { /* Đơn bị huỷ */ })
  .listen(".don-hang.da-huy", (data) => { /* Đơn huỷ từ admin */ })
  .listen(".don-hang.hoan-thanh", (data) => { /* Đơn hoàn thành */ })
  .listen(".don-hang.dang-lam", (data) => { /* Quán đang làm (tinh_trang=2) */ })
  .listen(".don-hang.da-xong", (data) => { /* Quán xong (tinh_trang=3) */ });
```

---

## 📱 Sử Dụng Trong Các Màn Hình

### Khách hàng — Theo dõi đơn hàng (`Orders.tsx`)

Bản đồ nhúng tự động chuyển chế độ theo `tinh_trang`:

```
tinh_trang <= 2 (Chờ/Đã nhận/Đang làm)
  → InlineDeliveryMap mode="dual_address"
     destAddress = địa chỉ quán
     secondAddress = địa chỉ khách hàng

tinh_trang = 3 (Đang giao) + chưa có GPS shipper
  → InlineDeliveryMap mode="dual_address" (fallback)

tinh_trang = 3 (Đang giao) + có GPS shipper
  → InlineDeliveryMap mode="shipper_to_customer"
     shipperCoord = tọa độ GPS thật
     secondCoord = tọa độ khách hàng (từ API tracking)

tinh_trang = 4 (Đã giao)
  → InlineDeliveryMap mode="dual_address" (static overview)
```

**API tracking cho khách hàng:**
```
POST /khach-hang/don-hang/theo-doi-don-hang
Body: { id: orderId }
Response: { order: { shipper_lat, shipper_lng, customer_lat, customer_lng } }
```

### Shipper — Quản lý đơn hàng (`ShipperOrders.tsx`)

Shipper có 2 nút bản đồ trong panel chi tiết đơn (`dang_giao` tab):

| Nút | Component | Điểm đến |
|---|---|---|
| "Xem bản đồ giao hàng" 🗺️ | `DeliveryMapModal` | Shipper → Khách hàng |
| "Chỉ đường đến quán ăn" 🧭 | `DeliveryMapModal` | Shipper → Quán ăn |

```tsx
{/* Bản đồ đến khách hàng */}
<DeliveryMapModal
  visible={showMap}
  mode="shipper_delivery"
  destAddress={deliveryAddr}
  destName={order.ten_nguoi_nhan}
  destCoord={[customer_lng, customer_lat]}
  restaurantCoord={[restaurant_lng, restaurant_lat]}
  shipperCoord={shipperCoord}  // GPS real-time
/>

{/* Bản đồ đến quán ăn */}
<DeliveryMapModal
  visible={showMapToRestaurant}
  mode="shipper_delivery"
  destAddress={order.dia_chi_quan}
  destName={order.ten_quan_an}
  destCoord={[restaurant_lng, restaurant_lat]}
  shipperCoord={shipperCoord}  // GPS real-time
/>
```

**API tracking cho shipper:**
```
POST /shipper/don-hang/theo-doi
Body: { id: orderId }
Response: { order: { shipper_lat, shipper_lng } }
```

---

## 🗂️ Cấu Trúc File Liên Quan

```
src/
├── config/
│   └── mapbox.ts              ← API keys, URLs, helper functions
├── utils/
│   └── location.ts            ← Xin quyền GPS (iOS & Android)
├── components/
│   ├── DeliveryMapModal.tsx   ← Modal bản đồ chỉ đường toàn màn hình (Shipper)
│   └── InlineDeliveryMap.tsx  ← Bản đồ nhúng theo trạng thái đơn (Khách)
└── pages/
    ├── Clients/
    │   ├── Orders.tsx          ← Theo dõi đơn hàng (dùng InlineDeliveryMap)
    │   └── RestaurantMap.tsx   ← Bản đồ tìm quán ăn (maplibre-gl)
    └── Shipper/
        └── ShipperOrders.tsx   ← Quản lý đơn (dùng DeliveryMapModal)
```

---

## ⚠️ Các Lưu Ý Khi Phát Triển Thêm

1. **Tọa độ convention:** Tất cả props đều nhận `[longitude, latitude]` — nhưng NDA API Direction nhận `lat,lng`. Xem `ndaDirectionsURL()` trong `mapbox.ts`.

2. **iOS Simulator:** GPS mặc định là San Francisco → app sẽ tự bỏ qua (không nằm trong Việt Nam) và fallback về server coord.

3. **WebView & Modal iOS:** Không mở 2 Modal cùng lúc trên iOS. `ShipperOrders.tsx` đóng `selectedOrder` panel trước, đợi 300ms rồi mới mở modal xác nhận.

4. **Geocoding chỉ hỗ trợ Đà Nẵng:** Hàm geocode tự động thêm ", Đà Nẵng" vào query. Cần sửa nếu mở rộng ra nhiều tỉnh.

5. **OSRM Public API:** Đang dùng server public miễn phí. Nếu deploy production cần cân nhắc dùng server OSRM riêng hoặc API có SLA.

6. **NDA API Key:** Key hiện đang hardcode trong `mapbox.ts`. Cần chuyển sang environment variable khi production.
