# Alert Real-Time Implementation Guide

## 📋 Tóm Tắt Thay Đổi

Đã implement **toàn bộ** alert real-time flow theo best practices:

### Backend (Laravel)
✅ **AlertUpdated Event** - Broadcast khi alert status thay đổi  
✅ **AlertResolved Event** - Broadcast khi alert được giải quyết  
✅ **Enhanced AlertCreated** - Include geometry + affected areas  
✅ **AlertController** - Broadcast events khi updateStatus  
✅ **Location Filtering** - Scope alerts theo vị trí citizen  
✅ **Channel Auth** - Define 'flood' channel trong routes/channels.php  

### Frontend (Next.js)
✅ **RealtimeContext Updates** - Listen to .alert.updated & .alert.resolved  
✅ **Reconnect Logic** - Auto-retry WebSocket khi fail  
✅ **Custom Hook** - `useAlertEvents` để dễ handle events  
✅ **Alert Listener Component** - Example để dispatch custom events  
✅ **Error Handling** - Track connectionError state  

---

## 🚀 Usage Guide

### Backend: Broadcasting Alert Events

#### 1. AlertCreated Event (Enhanced)
Khi tạo cảnh báo → broadcast với đầy đủ thông tin:
```php
// app/Http/Controllers/Api/AlertController.php
broadcast(new AlertCreated($alert->fresh()))->toOthers();

// Broadcast data include:
// - geometry (PostGIS)
// - affected_districts, affected_wards, affected_flood_zones
// - radius_km, effective_from/until
```

#### 2. AlertUpdated Event (New)
Khi thay đổi status (draft → active → updated):
```php
// app/Events/AlertUpdated.php
$alert->update(['status' => 'active']);
broadcast(new AlertUpdated($alert->fresh()))->toOthers();

// Broadcast data:
// - id, alert_number, title, description
// - status (new), updated_at
```

#### 3. AlertResolved Event (New)
Khi resolve/close alert:
```php
// app/Http/Controllers/Api/AlertController.php
$alert->resolve($user->id);  // Set resolved_by & resolved_at
broadcast(new AlertResolved($alert->fresh()))->toOthers();

// Broadcast data:
// - id, alert_number, title, status
// - resolved_by, resolved_at
```

#### 4. Location-Based Filtering
Citizen users chỉ nhận alerts từ district của họ:
```php
// GET /api/alerts
if ($user->hasRole('citizen')) {
    $districts = $user->district_id ? [(string) $user->district_id] : [];
    $query->whereJsonContains('affected_districts', $districts);
}

// GET /api/public/alerts/geojson
// Same filtering applied
```

---

### Frontend: Consuming Alert Events

#### 1. Using RealtimeContext
```typescript
'use client';
import { useRealtime } from '@/lib/realtime-context';

export function MyComponent() {
  const { state } = useRealtime();

  return (
    <div>
      Connection: {state.connected ? '✅' : '❌'}
      {state.connectionError && <p>Error: {state.connectionError}</p>}
      Last Alert: {state.lastAlert?.title}
      Unread: {state.unreadCount}
    </div>
  );
}
```

#### 2. Using Custom Hook `useAlertEvents`
```typescript
'use client';
import { useAlertEvents } from '@/lib/useAlertEvents';

export function AlertPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useAlertEvents({
    onAlertCreated: (data) => {
      setAlerts(prev => [data, ...prev]);
      toast.warning(`Cảnh báo: ${data.title}`);
    },

    onAlertUpdated: (data) => {
      setAlerts(prev =>
        prev.map(a => a.id === data.id ? { ...a, ...data } : a)
      );
    },

    onAlertResolved: (data) => {
      setAlerts(prev => prev.filter(a => a.id !== data.id));
      toast.success(`✔️ ${data.alert_number} đã được giải quyết`);
    },
  });

  return (
    <div>
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
```

#### 3. Using AlertListener Component
```typescript
// src/app/dashboard/page.tsx
import { AlertListener } from '@/components/realtime/AlertListener';

export default function Dashboard() {
  return (
    <>
      <AlertListener />
      {/* Rest of dashboard */}
    </>
  );
}
```

#### 4. Map Integration with Geometry
```typescript
'use client';
import { useAlertEvents } from '@/lib/useAlertEvents';
import { MapContainer, GeoJSON } from 'react-leaflet';

export function AlertMap() {
  const [alertGeometries, setAlertGeometries] = useState<any[]>([]);

  useAlertEvents({
    onAlertCreated: (data) => {
      if (data.geometry) {
        setAlertGeometries(prev => [...prev, data.geometry]);
      }
    },

    onAlertResolved: (data) => {
      setAlertGeometries(prev =>
        prev.filter(g => g.properties?.id !== data.id)
      );
    },
  });

  return (
    <MapContainer>
      {alertGeometries.map((geom, i) => (
        <GeoJSON key={i} data={geom} />
      ))}
    </MapContainer>
  );
}
```

---

## 📡 Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Laravel)                        │
├─────────────────────────────────────────────────────────────┤
│ AlertController                                             │
│ └─ store() ──┬──> AlertCreated                             │
│              │    ├─ geometry (PostGIS)                    │
│              │    ├─ affected_districts                    │
│              │    └─ broadcast to 'flood' channel          │
│                                                             │
│ └─ updateStatus() ──┬──> AlertUpdated                      │
│                     │    ├─ status changed                 │
│                     │    └─ broadcast to 'flood' channel   │
│                     │                                       │
│                     └──> AlertResolved                     │
│                          ├─ status = 'resolved'            │
│                          ├─ resolved_by, resolved_at       │
│                          └─ broadcast to 'flood' channel   │
└─────────────────────────────────────────────────────────────┘
                            ↓ WebSocket
         ┌───────────────────────────────────────┐
         │    Reverb (WebSocket Broadcaster)     │
         │  Channel: 'flood' (public)            │
         └───────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│ RealtimeContext                                             │
│ └─ echo.channel('flood')                                   │
│    ├─ .listen('.alert.created', ...)                       │
│    ├─ .listen('.alert.updated', ...)                       │
│    └─ .listen('.alert.resolved', ...)                      │
│       └─ window.dispatchEvent('aegis:alert:*')             │
│                                                             │
│ Components                                                  │
│ └─ useAlertEvents()                                         │
│    ├─ onAlertCreated()                                     │
│    ├─ onAlertUpdated()                                     │
│    └─ onAlertResolved()                                    │
│                                                             │
│ UI Updates                                                  │
│ ├─ AlertPanel (add new alert)                             │
│ ├─ AlertMap (show geometry)                               │
│ ├─ Toast notifications                                     │
│ └─ Mark as read/resolved                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Reconnect Logic

Nếu WebSocket disconnect:
```
1. RealtimeContext catch error
2. Set: connected = false, connectionError = msg
3. Retry setupListeners() after 5 seconds
4. Loop quay lại bước 1 nếu vẫn fail

⚠️ Frontend vẫn operational nhưng không nhận realtime updates
💡 Implement fallback polling nếu muốn (optional)
```

### Manual Reconnect
```typescript
const { reconnect } = useRealtime();
<button onClick={reconnect}>Reconnect WebSocket</button>
```

---

## ✅ Event Data Schemas

### AlertCreated / AlertUpdated
```json
{
  "id": 1,
  "alert_number": "ALT-20260424-ABC1",
  "title": "Mưa lớn khu vực Hà Nội",
  "description": "...",
  "alert_type": "flood_warning",
  "severity": "high",
  "status": "active",
  "source": "operator",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[105.0, 21.0], ...]]
  },
  "affected_districts": ["1", "2"],
  "affected_wards": ["1", "2", "3"],
  "affected_flood_zones": ["zone-a", "zone-b"],
  "radius_km": 5.5,
  "effective_from": "2026-04-24T10:00:00Z",
  "effective_until": "2026-04-24T18:00:00Z",
  "created_at": "2026-04-24T09:30:00Z",
  "updated_at": "2026-04-24T10:15:00Z"
}
```

### AlertResolved
```json
{
  "id": 1,
  "alert_number": "ALT-20260424-ABC1",
  "title": "Mưa lớn khu vực Hà Nội",
  "status": "resolved",
  "resolved_by": 5,
  "resolved_at": "2026-04-24T17:45:00Z",
  "updated_at": "2026-04-24T17:45:00Z"
}
```

---

## 📁 Files Modified / Created

### Backend
- ✅ `app/Events/AlertUpdated.php` (NEW)
- ✅ `app/Events/AlertResolved.php` (NEW)
- ✅ `app/Events/AlertCreated.php` (MODIFIED - add geometry)
- ✅ `app/Http/Controllers/Api/AlertController.php` (MODIFIED - broadcast events, location filtering)
- ✅ `routes/channels.php` (MODIFIED - add flood channel definition)

### Frontend
- ✅ `src/lib/realtime-context.tsx` (MODIFIED - add listeners for updated/resolved)
- ✅ `src/lib/useAlertEvents.ts` (NEW - custom hook)
- ✅ `src/components/realtime/AlertListener.tsx` (NEW - example component)

---

## 🧪 Testing

### Test AlertCreated
```bash
# Backend: Create alert
POST /api/alerts
{
  "title": "Test alert",
  "alert_type": "flood_warning",
  "severity": "high"
}

# Frontend: Should see:
# 1. WebSocket event on 'flood' channel
# 2. console.log from RealtimeContext
# 3. window event: aegis:alert:created
```

### Test AlertUpdated
```bash
# Backend: Update alert status
PUT /api/alerts/1/status
{ "status": "active" }

# Frontend: Should see:
# 1. AlertUpdated event broadcast
# 2. Component state updated via useAlertEvents
# 3. UI reflects new status
```

### Test AlertResolved
```bash
# Backend: Resolve alert
PUT /api/alerts/1/status
{ "status": "resolved" }

# Frontend: Should see:
# 1. AlertResolved event broadcast
# 2. Alert removed from list
# 3. Toast: "Alert ALT-20260424-ABC1 resolved"
```

### Debug WebSocket
```typescript
// In browser console:
// Check echo connection
window.Echo.connector.socket.state

// Listen to specific channel
window.Echo.channel('flood')
  .listen('.alert.created', (data) => console.log('Alert:', data))
```

---

## 🎯 Best Practices

### 1. **Component Updates**
Khi component mount → subscribe events  
Khi component unmount → unsubscribe  
`useAlertEvents` tự động handle cleanup ✅

### 2. **State Management**
Dùng `useAlertEvents` cho component-level state  
Dùng `RealtimeContext` cho app-level state  
Tránh race conditions khi update UI ✅

### 3. **Error Handling**
Check `state.connectionError` để detect WebSocket fail  
Implement fallback (polling API mỗi 30s) nếu WebSocket down  
Show user-friendly message khi offline ✅

### 4. **Performance**
`useMemo` cho alert list transformations  
Avoid re-rendering whole list on each update  
Use `map()` to update only changed items ✅

### 5. **Location Filtering**
Backend tự động filter alerts theo `user.district_id`  
Frontend không cần lo về filtering  
API returns chỉ relevant alerts ✅

---

## 🔐 Security

✅ **Channel Auth** - 'flood' channel explicit auth  
✅ **Data Validation** - Validate all input before broadcast  
✅ **Rate Limiting** - Consider throttling alert creation  
✅ **Location Privacy** - Only share affected areas, not sensitive data  

### Future: Encrypted Broadcast
```php
// If alerts contain sensitive info:
Broadcast::channel('flood.{districtId}', function ($user, $districtId) {
    return $user->district_id == $districtId;
});
```

---

## 🚨 Troubleshooting

### WebSocket không kết nối
1. Check Reverb running: `php artisan reverb:start`
2. Check env vars: `NEXT_PUBLIC_REVERB_HOST`, `NEXT_PUBLIC_REVERB_PORT`
3. Check browser console untuk errors
4. Check firewall không block ws://

### Alert không update real-time
1. Check RealtimeContext connected
2. Check channel listeners registered
3. Check backend broadcast events dispatched
4. Check DB transaction (events dispatch sau commit)

### Geometry không display trên map
1. Check geometry column có data (SELECT ST_AsGeoJSON(geometry))
2. Check database driver = PostgreSQL
3. Check broadcast include geometry
4. Check GeoJSON parser valid

---

## 📚 References

- [Laravel Broadcasting](https://laravel.com/docs/broadcasting)
- [Reverb Documentation](https://reverb.laravel.com/)
- [Laravel Echo](https://laravel.com/docs/echo)
- [Next.js Event System](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
