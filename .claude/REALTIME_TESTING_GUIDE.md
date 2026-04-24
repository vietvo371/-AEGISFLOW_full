# Real-Time Alert Testing Guide

## 🎯 Tổng Quan

Vừa implement **3 thành phần real-time popup/notification** cho alerts:

1. **AlertNotificationToast** - Toast notifications theo severity
2. **RoleBasedAlertHandler** - Xử lý theo role (Admin/Citizen/Team)
3. **AlertPopupModal** - Popup modal với animation
4. **RealtimeProviders** - Mount ở root layout

---

## 🚀 Cách Test

### Step 1: Đảm bảo tất cả services chạy

```bash
# Terminal 1: Backend
cd backend && php artisan serve --port=8000

# Terminal 2: Reverb WebSocket
cd backend && php artisan reverb:start --port=8080

# Terminal 3: Frontend
cd frontend && yarn dev

# Terminal 4: Queue worker (nếu cần)
cd backend && php artisan queue:work
```

### Step 2: Kiểm tra WebSocket connection

Mở browser DevTools:
```javascript
// Console
window.Echo.connector.socket.state
// Output: 'connected' hoặc 'connecting'
```

### Step 3: Chạy test script

```bash
./test_realtime_flow.sh
```

**Expected Output:**
```
✅ Login successful!
✅ Incident created! ID: 1
✅ Alert created! ID: 1
✅ Rescue Request created! ID: 1
```

### Step 4: Kiểm tra Frontend

Mở http://localhost:3000 và chọn role (Admin/Citizen/Team)

**Mong chờ thấy:**
- 🔔 **Toast notification** ở góc phải trên
- 📱 **Popup modal** hiển thị chi tiết alert
- ✨ **Animation** khi popup xuất hiện

---

## 📱 Theo Từng Role

### ADMIN / RESCUE OPERATOR
**Khi Alert được tạo:**
1. ✅ Toast: "🚨 CẢNH BÁO NGHIÊM TRỌNG" (nếu critical)
2. ✅ Modal popup với:
   - Tiêu đề, mô tả
   - Khu vực ảnh hưởng
   - Severity level
   - Button: "Xem chi tiết" → `/dashboard/alerts/:id`
3. ✅ Custom event dispatched: `admin:alert:new`

**Khi Alert được cập nhật:**
- Toast info: "Cảnh báo XYZ được cập nhật"

**Khi Alert được resolve:**
- Toast success: "✅ Giải quyết"

### CITIZEN
**Khi Alert được tạo (district của họ):**
1. ✅ Toast: Warning with evacuation guidance
2. ✅ Modal popup với:
   - Hướng dẫn sơ tán
   - Khu vực bị ảnh hưởng
   - Action buttons
3. ✅ Custom event: `citizen:alert:warning`

**Guidance Examples:**
- Flood Warning: "🌊 Sơ tán đến địa điểm an toàn"
- Evacuation: "🏃 SƠ TÁN NGAY"
- Heavy Rain: "🌧️ Ở nhà nếu có thể"

### RESCUE TEAM
**Khi Alert được tạo:**
1. ✅ Toast: "📍 Cảnh báo mới"
2. ✅ Modal popup với:
   - Khu vực cần cứu hộ
   - Dự đoán số người cần cứu
3. ✅ Custom event: `team:alert:incoming`

---

## 🎬 Test Scenarios

### Scenario 1: Admin tạo Critical Alert

```bash
# 1. Login với admin account
curl -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"admin@aegisflow.ai","password":"password"}'

# 2. Tạo alert
curl -X POST http://localhost:8000/api/alerts \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "title": "NGẬP LỤT TOÀN THÀNH PHỐ",
    "description": "Nước từng lập lên tới 2m",
    "alert_type": "evacuation",
    "severity": "critical",
    "affected_districts": ["1","2","3"]
  }'
```

**Frontend sẽ:**
- 🔴 Hiện popup modal màu đỏ
- 🚨 Toast error notification
- ✨ Auto-dismiss sau 15 giây (hoặc click button)

### Scenario 2: Citizen nhận alert của district mình

```bash
# 1. Login với citizen account (district 1)
curl -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"citizen@aegisflow.ai","password":"password"}'

# 2. Admin tạo alert cho district 1
# (citizen sẽ thấy vì trong district của họ)
```

**Frontend Citizen sẽ:**
- ⚠️ Hiện guidance "Sơ tán đến địa điểm an toàn"
- 📍 Popup với khu vực "District 1"
- 🔔 Toast với thông tin action cần làm

### Scenario 3: Citizen không thấy alert khác district

```bash
# Citizen district 1
# Alert tạo cho district 2
# → Citizen sẽ KHÔNG thấy (backend filter)
```

---

## 🔍 Debug WebSocket Events

### Browser Console

```javascript
// Listen to custom events
window.addEventListener('admin:alert:new', (e) => {
  console.log('Admin received alert:', e.detail);
});

window.addEventListener('citizen:alert:warning', (e) => {
  console.log('Citizen warning:', e.detail);
});

window.addEventListener('team:alert:incoming', (e) => {
  console.log('Team incoming alert:', e.detail);
});

// Check RealtimeContext state
window.dispatchEvent(new CustomEvent('check-realtime'));
```

### Check Reverb Connection

```javascript
// Check if connected
window.Echo.connector.socket.state
// 'connected' = OK
// 'connecting' = Waiting
// 'disconnected' = ERROR

// Check channels
window.Echo.connector.socket.channels
```

---

## 🎨 Popup Modal Features

### Auto-dismiss Behavior
- **Critical/High**: Không tự động dismiss (user phải close)
- **Medium/Low**: Tự dismiss sau 10 giây

### Animation
- Entry: `scale 0.95 → 1.0` + `opacity 0 → 1`
- Exit: Reverse animation
- Backdrop fade in/out

### Responsive
- Desktop: `max-w-md` (448px)
- Mobile: `w-full` (full width with padding)

### Severity Colors
| Severity | Color | Icon |
|----------|-------|------|
| Critical | 🔴 Red | AlertTriangle |
| High | 🟠 Orange | AlertCircle |
| Medium | 🟡 Yellow | Bell |
| Low | 🔵 Blue | Bell |

---

## 📊 Components Created

### 1. AlertNotificationToast.tsx
- Toast notifications theo severity
- Tự động dismiss hoặc manual close
- Hiển thị affected areas

### 2. RoleBasedAlertHandler.tsx
- Xử lý logic riêng cho từng role:
  - Admin: Thấy tất cả + monitor
  - Citizen: Thấy + hướng dẫn sơ tán
  - Team: Thấy + chuẩn bị cứu hộ
- Dispatch custom events

### 3. AlertPopupModal.tsx
- Popup modal với animation
- Severity-based styling
- Action buttons (Chi tiết)
- Auto-dismiss cho low/medium

### 4. RealtimeProviders.tsx
- Mount ở root layout
- Kết hợp 3 components

---

## ✅ Checklist Trước Deploy

- [ ] Reverb running on port 8080
- [ ] NEXT_PUBLIC_REVERB_* env vars đúng
- [ ] WebSocket connection working (`window.Echo.connector.socket.state`)
- [ ] Toast/Modal hiển thị đúng severity color
- [ ] Evacuation guidance hiển thị cho citizen
- [ ] Alert update/resolve broadcast working
- [ ] Role-based filtering đúng (citizen không thấy alert khác district)
- [ ] Modal animation smooth
- [ ] Mobile responsive

---

## 🐛 Troubleshooting

### Popup không hiển thị

**Check:**
1. `RealtimeProviders` mounted ở layout?
2. `useAlertEvents` hook đang lắng nghe?
3. WebSocket connected? (`window.Echo.connector.socket.state`)
4. Alert event dispatched từ backend? (Kiểm tra Reverb logs)

**Fix:**
```javascript
// Browser console
// Check if handler registered
window.dispatchEvent(new CustomEvent('aegis:alert:created', {
  detail: { id: 1, title: 'Test', severity: 'critical' }
}));
// Should see modal appear
```

### Toast notification không hiển thị

**Check:**
1. `AlertNotificationToast` component mounted?
2. `Toaster` từ sonner ở layout?
3. Event dispatched? (`aegis:alert:created`)

**Fix:**
```javascript
// Manually trigger
import { toast } from 'sonner';
toast.warning('Test toast', {
  description: 'This is a test',
  duration: 5000,
});
```

### WebSocket không connect

**Check:**
1. Reverb running: `ps aux | grep reverb`
2. Port 8080 open: `lsof -i :8080`
3. Env vars correct: `echo $NEXT_PUBLIC_REVERB_*`
4. No firewall blocking: `sudo lsof -i -P`

**Fix:**
```bash
# Restart Reverb
cd backend
php artisan reverb:start --port=8080 --debug
```

### Alert update/resolve không broadcast

**Check:**
1. Backend broadcasting events? (kiểm tra AlertUpdated/AlertResolved events)
2. Frontend listening? (check `useAlertEvents`)
3. Reverb logs? (`storage/logs/reverb.log`)

**Fix:**
```php
// Backend - test broadcast manually
php artisan tinker
>>> $alert = Alert::find(1);
>>> broadcast(new AlertCreated($alert))->toOthers();
// Check browser console
```

---

## 📱 Test with Different Accounts

### Tạo test accounts
```sql
-- Admin
INSERT INTO users (name, email, password, role, district_id)
VALUES ('Admin Test', 'admin@test.local', bcrypt('password'), 'admin', NULL);

-- Citizen District 1
INSERT INTO users (name, email, password, role, district_id)
VALUES ('Citizen Test', 'citizen@test.local', bcrypt('password'), 'citizen', 1);

-- Rescue Team
INSERT INTO users (name, email, password, role, district_id)
VALUES ('Team Test', 'team@test.local', bcrypt('password'), 'rescue_team', NULL);
```

### Test flow:
1. Login các accounts khác nhau
2. Admin tạo alert
3. Xem mỗi user thấy gì khác nhau
4. Test update/resolve

---

## 🎓 Next Steps

1. ✅ Test full flow theo guide này
2. ✅ Adjust colors/messages theo branding
3. ✅ Add sound notification (optional)
4. ✅ Test load with 100+ concurrent users
5. ✅ Monitor WebSocket memory usage
6. ✅ Deploy to staging
7. ✅ Deploy to production

---

**Status:** 🟢 Ready for Testing
