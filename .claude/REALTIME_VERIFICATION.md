# Realtime System Verification Checklist

## Fixed Issues

### 1. ✅ Fixed: `ssr: false` in Server Component
- **Problem**: `app/layout.tsx` (Server Component) sử dụng `dynamic()` với `ssr: false`
- **Solution**: Import trực tiếp `RealtimeProviders` thay vì dynamic
- **Files**: `frontend/src/app/layout.tsx`

### 2. ✅ Fixed: Missing RealtimeListener
- **Problem**: `RealtimeListener.tsx` không được mount → WebSocket không kết nối
- **Solution**: Thêm `RealtimeListener` vào `RealtimeProviders`
- **Files**: `frontend/src/components/realtime/RealtimeProviders.tsx`

### 3. ✅ Added: Notification Icon in Header
- **Feature**: Icon thông báo (bell) trên header hiển thị số lượng alert chưa đọc
- **Files**: `frontend/src/components/layout/header/header.tsx`

### 4. ✅ Fixed: Array handling for `affected_districts`
- **Problem**: Code cố gọi `.join()` trên string thay vì array
- **Solution**: Thêm `Array.isArray()` check trước khi sử dụng array methods
- **Files**: 
  - `frontend/src/components/realtime/AlertNotificationToast.tsx`
  - `frontend/src/components/realtime/AlertPopupModal.tsx`
  - `frontend/src/components/realtime/RoleBasedAlertHandler.tsx`

## Testing Steps

### Step 1: Ensure Backend Services Running
```bash
# Terminal 1: Laravel backend
cd backend
php artisan serve --port=8000

# Terminal 2: Laravel Reverb (WebSocket)
cd backend
php artisan reverb:start --port=8080

# Terminal 3: Frontend
cd frontend
yarn dev

# Terminal 4: (Optional) Queue worker
cd backend
php artisan queue:work --tries=3 --sleep=1
```

### Step 2: Open Browser Console
Open DevTools (F12) and go to Console tab. You should see:
```
[RealtimeListener] 🔌 Connecting to Reverb...
[RealtimeListener] ✅ Subscribed to channel: flood
```

### Step 3: Create Alert via Backend
Use Laravel Tinker or API call:

```bash
# Via Tinker
php artisan tinker
```

```php
App\Models\Alert::create([
    'alert_number' => 'TEST-' . now()->timestamp,
    'title' => 'Test Alert',
    'description' => 'This is a test alert for realtime',
    'alert_type' => 'flood_warning',
    'severity' => 'critical',
    'status' => 'active',
    'affected_districts' => ['Quận 1', 'Quận 3'],
    'source' => 'manual'
]);

event(new \App\Events\AlertCreated($alert));
```

Or via API:
```bash
curl -X POST http://localhost:8000/api/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_number": "TEST-001",
    "title": "Test Alert",
    "description": "Testing realtime notifications",
    "alert_type": "flood_warning",
    "severity": "critical",
    "affected_districts": ["Quận 1", "Quận 3"],
    "source": "manual"
  }'
```

### Step 4: Check Frontend for Indicators

**Expected to see:**
1. ✅ Toast notification (top-right corner)
   - Icon: Bell or AlertTriangle
   - Color: Red for critical, Orange for high, Yellow for medium, Blue for low
   
2. ✅ Popup modal (center of screen)
   - Large alert popup with detailed information
   - Auto-closes after 10 seconds for critical alerts
   
3. ✅ Header notification badge
   - Bell icon (🔔) with red badge showing count
   - Count increments with each new alert
   - Clickable → links to `/dashboard/alerts`

### Step 5: Monitor Console Logs
```
[RealtimeListener] 🔔 AlertCreated received: {...}
```

If you DON'T see this, the WebSocket connection failed. Check:
- Is Reverb running on port 8080?
- Is `NEXT_PUBLIC_REVERB_KEY` and other env vars set correctly?
- Are there network errors in DevTools?

## Environment Variables Needed

Create/verify `.env.local` in `frontend/`:
```env
NEXT_PUBLIC_REVERB_KEY=aegisflow-key
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=ws
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Troubleshooting

### Issue: Toast appears but popup doesn't
**Check**: `AlertPopupModal` uses `useAlertEvents()` which listens for `aegis:alert:created` event
- `RealtimeListener` should emit this event
- Make sure `RealtimeListener` is mounted in `RealtimeProviders`

### Issue: Header badge doesn't increment
**Check**: Header has `useEffect` listening to `aegis:alert:created` event
- Browser console should log event dispatch

### Issue: WebSocket not connecting
**Check**:
1. Is Reverb running? `lsof -i :8080`
2. Are env vars correct?
3. Is `NEXT_PUBLIC_REVERB_KEY` same in backend config?
   - Backend: `config/reverb.php`
   - Frontend: `.env.local` or `NEXT_PUBLIC_REVERB_KEY`

### Issue: "Channel 'flood' is private" error
**Check**: `routes/channels.php` - public channels don't need auth
- Current setup uses `Channel('flood')` which is public ✓

## Component Flow

```
RealtimeListener
  ├─ Connects to WebSocket (Reverb)
  ├─ Listens for `.AlertCreated` event
  ├─ Emits `aegis:alert:created` custom event
  └─ Shows toast notification

AlertPopupModal
  ├─ Listens to `aegis:alert:created` event
  ├─ Sets state to show popup
  └─ Auto-closes after timeout

AlertNotificationToast
  ├─ Listens to `aegis:alert:created` event
  ├─ Shows toast notification (alternative to popup)
  └─ Different styling per severity

Header
  ├─ Listens to `aegis:alert:created` event
  ├─ Increments unreadAlerts counter
  ├─ Shows badge on bell icon
  └─ Links to `/dashboard/alerts`

RoleBasedAlertHandler
  ├─ Listens to `aegis:alert:created` event
  ├─ Dispatches role-specific toast
  └─ No longer needs custom events
```

## Notes
- All realtime handlers are in `/frontend/src/components/realtime/`
- WebSocket connection established once in `RealtimeListener`
- Custom events used to broadcast to multiple listeners
- Each component can listen independently without knowing about others
