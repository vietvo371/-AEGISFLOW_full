# AegisFlow AI — Mobile Design System & Screen Specifications

## Dùng prompt này để design mobile app React Native cho AegisFlow AI

---

## 1. DESIGN SYSTEM (đồng bộ với web)

### Brand Colors
```
Primary (Violet):     #7a5af8 (brand-500)
Primary Light:        #9b8afb (brand-400)
Primary Dark:         #6938ef (brand-600)
Secondary (Amber):    #F59E0B
Accent (Red/Emergency): #EF4444

Success:   #17b26a
Warning:   #f79009
Danger:    #f04438
Info:      #7a5af8
```

### Severity Colors (dùng cho alerts, incidents)
```
Critical: #EF4444 (đỏ) — bg: #FEF2F2
High:     #F97316 (cam) — bg: #FFF7ED
Medium:   #EAB308 (vàng) — bg: #FEFCE8
Low:      #3B82F6 (xanh dương) — bg: #EFF6FF
```

### Backgrounds
```
Background:       #FFFFFF
BackgroundSecondary: #F8F9FB
BackgroundTertiary:  #F0F2F5
Card:             #FFFFFF
Surface:          #FAFBFC
```

### Text
```
Primary text:     #111827
Secondary text:   #6B7280
Tertiary text:    #9CA3AF
Light text:       #D1D5DB
```

### Border & Divider
```
Border:       #E5E7EB
Border light: #F3F4F6
```

### Typography
- Font: Inter (iOS) / Roboto (Android)
- Sizes: 10/12/14/16/18/20/24/28/32/40/48
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

### Spacing Scale
```
xs: 4, sm: 8, md: 12, lg: 16, xl: 20, 2xl: 24, 3xl: 32, 4xl: 40, 5xl: 48
```

### Border Radius
```
xs: 4, sm: 8, md: 12, lg: 16, xl: 20, 2xl: 24, full: 9999
```

### Shadows (iOS)
```
sm: { offset: {0,2}, opacity: 0.08, radius: 3 }
md: { offset: {0,4}, opacity: 0.1, radius: 6 }
lg: { offset: {0,8}, opacity: 0.12, radius: 12 }
```

### Gradients
```
Primary: ['#7a5af8', '#9b8afb'] — violet gradient header
Dark:    ['#0F172A', '#1E293B']
```

---

## 2. LAYOUT PATTERNS

### Bottom Tab Bar (5 tabs)
- Height: 60px
- Active color: #7a5af8 (citizen) / #EF4444 (emergency)
- Inactive: #6B7280
- Center button (FAB): nổi lên, tròn, gradient primary, icon "+" (tạo báo cáo)
- Tabs citizen: Trang chủ | Bản đồ | [+] | Cảnh báo | Cá nhân
- Tabs emergency: Tình huống | Nhiệm vụ | Tuyến đường | Cá nhân

### Screen Layout
- SafeAreaView (top edge)
- Header: height ~100-120, có thể gradient primary
- Content: ScrollView hoặc FlatList, padding 16-20
- Cards: borderRadius 12-14, shadow sm, padding 14-16

### Navigation
- Stack navigator (slide from right)
- Back button: arrow-left icon, 40x40 touch area
- Top bar: 56px height, white bg, bottom border #F3F4F6

---

## 3. CITIZEN TAB SCREENS

### 3.1 HomeScreen (Trang chủ)

**Header** (gradient violet #7a5af8 → #9b8afb):
- Row: [Ngày tháng (vi-VN format) + Greeting "Xin chào, {tên}"] | [Bell icon + badge đỏ (unread count)]
- Row phụ: weather icon + nhiệt độ + độ ẩm + lượng mưa (text trắng nhỏ)

**Critical Alert Banner** (nếu có alert severity critical/high):
- Full-width card, bg: #EF4444, borderRadius 14
- Row: [Circle icon 44px bg white/20 → AlertTriangle] | [Title bold trắng + desc nhỏ] | [Chevron right]
- Tap → AlertDetail

**Quick Actions** (2x2 grid):
| Báo cáo ngập (icon: file-document, color: #3B82F6) | Yêu cầu cứu hộ (icon: lifebuoy, color: #EF4444) |
| Nơi trú ẩn (icon: home-roof, color: #22C55E) | Bản đồ ngập (icon: map-marker-radius, color: #8B5CF6) |
- Mỗi card: white bg, borderRadius 14, shadow sm, icon trong circle 52px (bg color+15% opacity), label 13px semibold

**Cảnh báo đang hoạt động** (section):
- Header row: "Cảnh báo đang hoạt động" | "Xem tất cả" (link primary)
- List 3 items max, mỗi item: card borderLeft 3px (severity color), icon alert, title, time, severity badge

**Sự cố gần đây** (section):
- Cards: white, borderRadius 12, shadow xs
- Row 1: title (bold 14) + severity badge
- Row 2: map-marker icon + address (truncate)
- Row 3: clock icon + date + status dot + status label

**Bottom shortcuts**:
- "Xem báo cáo của tôi" — row card, border #E5E7EB, icon file-multiple + text primary + chevron
- "Yêu cầu cứu hộ của tôi" — same, icon lifebuoy, text #EF4444

---

### 3.2 MapScreen (Bản đồ)

**Full-screen map** (OpenMapVN tiles):
- Style URL: `https://tiles.openmap.vn/styles/day-v1/style.json?apikey=...`
- Markers: incidents (severity-colored), shelters (green), sensors (blue), flood zones (polygon fill)
- Bottom floating panel (draggable): khi tap marker → hiển thị detail card

**Controls overlay**:
- Top-right: layer toggle buttons (incidents/shelters/sensors/flood)
- Bottom-right: locate-me button (GPS)
- Top-left: search bar (rounded, shadow)

---

### 3.3 CreateReport (Tạo báo cáo) — Center FAB

**Form screen** (scroll):
- Title input
- Description textarea (min-h 100)
- Category selector (grid 3x2): flood, heavy_rain, landslide, dam_failure, traffic, other
- Severity picker (4 buttons horizontal): low(blue), medium(yellow), high(orange), critical(red)
- Location: GPS auto + manual address input + mini map preview
- Photo upload (horizontal scroll gallery + add button)
- Submit button: full-width, primary gradient, height 56

---

### 3.4 AlertsScreen (Cảnh báo) — Tab "Cảnh báo"

**Header**: "Cảnh báo" (bold 24) + subtitle "Cập nhật tình hình ngập lụt & thời tiết"

**FlatList cards**:
- Mỗi card: flexDirection row, borderLeft 4px (severity color)
- Left: circle 44px (bg severity+15%), icon theo alert_type:
  - flood_warning → waves
  - heavy_rain → weather-pouring
  - dam_warning → wall
  - weather → weather-lightning
- Right content:
  - Row: title (15px semibold, flex 1) + severity badge (pill, bg severity+20%, text severity)
  - Description (13px, secondary, 2 lines max)
  - Footer row: clock icon + date + status badge ("Đang hoạt động" green / "Hết hạn" gray)

**Empty state**: bell-check icon 64px + "Không có cảnh báo nào" + "Khu vực của bạn hiện tại an toàn"

---

### 3.5 ProfileScreen (Cá nhân)

**Header card** (white, shadow):
- Avatar circle 64px (initials hoặc photo)
- Name (18px bold) + email (13px secondary)
- Edit profile button (outline)

**Menu sections** (grouped list):
- Báo cáo của tôi (icon: file-document)
- Yêu cầu cứu hộ (icon: lifebuoy)
- Thông báo (icon: bell) + badge unread
- ---divider---
- Đổi mật khẩu (icon: lock)
- Ngôn ngữ (icon: translate)
- Trung tâm trợ giúp (icon: help-circle)
- Giới thiệu (icon: information)
- ---divider---
- Đăng xuất (icon: logout, color: #EF4444)

---

## 4. ADDITIONAL SCREENS

### 4.1 AlertDetailScreen

**Top bar**: back arrow + "Chi tiết cảnh báo"

**Severity banner** (full-width card, bg theo severity light):
- Icon 28px + severity label (uppercase bold) + alert_type + status chip

**Title** (20px bold)
**Description** (15px, lineHeight 22)

**Info section** (white card, rows):
- Bắt đầu: clock-start + datetime
- Kết thúc: clock-end + datetime
- Nguồn: source-branch + text
- Phát hành: account + name

**Related incident button** (optional): link-variant icon + "Xem sự cố liên quan" + chevron

---

### 4.2 RescueRequestScreen (Yêu cầu cứu hộ)

**Emergency banner** (bg #FEF2F2, border #FECACA):
- phone-alert icon + "Nếu tình huống nguy hiểm, hãy gọi 113/114/115"

**Form sections**:
1. **Thông tin liên hệ**: caller_name + caller_phone (auto-fill from user)
2. **Vị trí**: GPS auto (blue info card showing address) + address input
3. **Mức độ khẩn cấp** (4 chips horizontal): Thấp(blue) / Trung bình(yellow) / Cao(orange) / Khẩn cấp(red) — selected: bg color+15%, border color
4. **Loại hỗ trợ** (7 items grid): Cứu hộ(lifebuoy) / Y tế(hospital) / Sơ tán(exit-run) / Lương thực(food) / Nước sạch(cup-water) / Nơi trú ẩn(home-roof) / Khác(dots) — selected: primary border + bg
5. **Số người** (counter): [-] [number 20px bold] [+]
6. **Nhóm cần ưu tiên** (checkboxes): Trẻ em / Người già / Người khuyết tật / Phụ nữ mang thai
7. **Mô tả** textarea
8. **Mực nước** number input

**Submit button**: bg #EF4444, full-width, height 56, icon send + "Gửi yêu cầu cứu hộ" (white bold)

---

### 4.3 MyRescueRequestsScreen

**Top bar**: back + "Yêu cầu cứu hộ của tôi" + [+] button

**FlatList cards**:
- Top row: urgency dot (8px circle) + category + urgency label + status badge (icon + text, bg status+15%)
  - Status: pending(yellow)/assigned(blue)/en_route(purple)/on_scene(orange)/completed(green)/cancelled(gray)
- Row: map-marker + address
- Row: account-multiple + "{n} người" + clock + date
- (if assigned) Divider + shield-account + "Đội: {team name}"

**Empty state**: lifebuoy 64px + "Chưa có yêu cầu cứu hộ"

---

### 4.4 ShelterListScreen (Nơi trú ẩn)

**Search bar** (top, rounded, icon search)
**Locate me button**

**Cards** per shelter:
- Name (bold) + status badge (open/full/closed)
- Address row (map-marker)
- Capacity: "{available_beds}/{capacity} chỗ trống" — progress bar
- Facilities: chips row (food/water/medical/electricity/toilet/wifi icons)
- Distance (if GPS): "2.3 km"
- Action: "Chỉ đường" button (outline)

---

### 4.5 WeatherDetailScreen

**Current weather card**: temperature big (32px), condition icon, humidity, wind, rainfall
**24h forecast**: horizontal scroll cards (hourly)
**Rainfall chart**: bar chart 7 days

---

### 4.6 NotificationsScreen

**FlatList**:
- Unread: bg primaryLight (#f4f3ff)
- Read: white bg
- Row: type icon (colored circle) + title + time + unread dot
- Swipe actions: mark read / delete

---

## 5. WEB CITIZEN PAGES (Reference UI)

Web dùng Next.js + shadcn/ui + Tailwind. Mobile cần đồng bộ về:
- Cùng data/API
- Cùng flow UX (SOS → tạo incident + rescue request)
- Cùng severity colors & status labels
- Cùng terminology (vi-VN)

**Web Citizen pages**:
- `/citizen` — Dashboard: greeting, SOS button (gradient red card), sensor stats (4 cards: mực nước, lượng mưa, nhiệt độ, độ ẩm), active alerts list, quick actions (shelters, weather), emergency contacts (113/114/115/1022)
- `/citizen/sos` — Form: title, type, severity, GPS location, vulnerable groups checkboxes, description → submit tạo incident + rescue-request cùng lúc
- `/citizen/alerts` — List: filter tabs (active/all), cards with severity border, icon, title, desc, datetime, type label, "Xem trên bản đồ" button
- `/citizen/shelters` — Search + locate, cards: name, status badge, address, capacity bar, facilities icons, distance, "chỉ đường"
- `/citizen/request` — My rescue requests list + create form (combine in 1 page)
- `/citizen/map` — Full-screen MapLibre with alerts/incidents/flood layers
- `/citizen/weather` — Weather detail
- `/citizen/profile` — User info, settings

---

## 6. DESIGN PRINCIPLES

1. **Emergency-first**: SOS/cứu hộ phải nổi bật nhất (red, large touch targets)
2. **Glanceable**: thông tin quan trọng (mực nước, cảnh báo active) phải nhìn thấy ngay không cần scroll
3. **Accessibility**: min touch target 44px, contrast ratio ≥4.5:1, icon + text labels
4. **Consistent severity**: luôn dùng cùng color mapping (critical=red, high=orange, medium=yellow, low=blue)
5. **Vietnamese-first**: tất cả labels tiếng Việt, format ngày dd/MM/yyyy, số phone 0xx.xxx.xxxx
6. **Offline-aware**: hiển thị last-updated timestamp, loading states rõ ràng
7. **Dark mode ready**: tất cả colors có dark variant (chưa implement nhưng structure sẵn)

---

## 7. ICON LIBRARY

Dùng: **MaterialCommunityIcons** (react-native-vector-icons)

Key icons:
- Home: home-variant
- Map: map-marker-outline / map-marker-radius
- Alert: alert-octagon / alert-circle / alert
- Bell: bell-outline
- Profile: account-circle
- Report: file-document-edit-outline
- Rescue: lifebuoy
- Shelter: home-roof
- Weather: weather-pouring / weather-partly-cloudy
- Sensor: gauge / waves
- Navigation: navigation-variant-outline
- Emergency: phone-alert / car-emergency
- Status: clock-outline / check-circle / close-circle

---

## 8. ANIMATIONS

- Page transition: slide_from_right (300ms)
- Card appear: fade-in-up (opacity 0→1, translateY 12→0, 500ms)
- Alert banner: subtle pulse glow (red shadow)
- Pull-to-refresh: standard RefreshControl
- Skeleton loading: shimmer effect on cards
- FAB: scale bounce on press

---

## YÊU CẦU CHO DESIGNER

Hãy design lại các screens mobile với design system trên, đảm bảo:
1. Đồng bộ visual language với web (cùng brand violet, cùng severity colors, cùng card patterns)
2. Mobile-native UX (bottom tabs, swipe gestures, FAB, bottom sheets)
3. Focus vào citizen flow: Home → Alert detail / SOS rescue / Map / Shelters
4. Pixel-perfect Figma/design với spacing system 4px grid
5. Cả light mode, có annotation cho dark mode
