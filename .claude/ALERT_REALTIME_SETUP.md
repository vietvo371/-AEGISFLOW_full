# Alert Real-Time Flow - Quick Setup Guide

## 🎯 Objective

Implement **full real-time alert system** using Laravel Reverb WebSocket:
- ✅ Create Alert → broadcast to all users
- ✅ Update Alert status → broadcast update
- ✅ Resolve Alert → broadcast resolution
- ✅ Frontend updates UI instantly without refresh

---

## 🚀 Quick Start (5 steps)

### Step 1: Database Migration
```bash
cd backend
php artisan migrate

# This adds district_id column to users table
# Enables location-based alert filtering
```

### Step 2: Start Backend Services
```bash
# Terminal 1: Laravel API server
cd backend
php artisan serve --port=8000

# Terminal 2: Reverb WebSocket server
cd backend
php artisan reverb:start --port=8080

# Terminal 3: Queue worker (for background jobs)
cd backend
php artisan queue:work --tries=3 --sleep=1
```

### Step 3: Start Frontend
```bash
cd frontend
yarn dev
# Opens on http://localhost:3000
```

### Step 4: Verify WebSocket Connection
```bash
# Open browser DevTools → Network → WS
# Should see connection to ws://localhost:8080

# Or in browser console:
console.log(window.Echo.connector.socket.state)
// Should return 'connected' or 'connecting'
```

### Step 5: Test Alert Creation
```bash
# Use API client (Postman/curl/Thunder Client)
POST http://localhost:8000/api/alerts
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Mưa lớn khu vực Hà Nội",
  "description": "Dự báo mưa lớn từ 14h hôm nay",
  "alert_type": "flood_warning",
  "severity": "high",
  "affected_districts": ["1", "2"],
  "effective_from": "2026-04-24T14:00:00Z",
  "effective_until": "2026-04-24T20:00:00Z"
}

✓ Response: 201 Created
✓ Frontend: Alert appears instantly (WebSocket event)
```

---

## 📋 What Changed in Code

### Backend: 3 New/Modified Events
```
✅ AlertCreated      (Enhanced with geometry + areas)
✅ AlertUpdated      (NEW - for status changes)
✅ AlertResolved     (NEW - for resolution)
```

### Backend: AlertController Updates
```php
// When creating alert
broadcast(new AlertCreated($alert))->toOthers();

// When updating status
if ($status === 'resolved') {
    broadcast(new AlertResolved($alert))->toOthers();
} else {
    broadcast(new AlertUpdated($alert))->toOthers();
}
```

### Frontend: Real-time Updates
```typescript
// Now listens to 3 events instead of just 'created'
useAlertEvents({
  onAlertCreated: (data) => addAlert(data),
  onAlertUpdated: (data) => updateAlert(data),
  onAlertResolved: (data) => removeAlert(data),
});
```

---

## 🔧 Configuration Check

### Backend (.env)
```env
BROADCAST_CONNECTION=reverb      ✅ Must be 'reverb'
REVERB_HOST=localhost            ✅ Must match frontend
REVERB_PORT=8080                 ✅ Must be open
REVERB_SCHEME=http               ✅ 'http' for dev, 'https' for prod
REVERB_APP_KEY=aegisflow-key    ✅ Key for authorization
```

### Frontend (.env.local / .env)
```env
NEXT_PUBLIC_REVERB_HOST=localhost        ✅ Must match backend
NEXT_PUBLIC_REVERB_PORT=8080             ✅ Must match backend
NEXT_PUBLIC_REVERB_SCHEME=http           ✅ Must match backend
NEXT_PUBLIC_REVERB_KEY=aegisflow-key    ✅ Must match backend
```

---

## 🧪 Testing Checklist

### ✅ Test 1: WebSocket Connection
```bash
# In browser console
window.Echo.channel('flood')
  .listen('.alert.created', data => {
    console.log('🎉 Alert received:', data);
  });

# Output should show:
# "✅ Connected to flood channel"
```

### ✅ Test 2: Create Alert
```bash
# Using curl or API client
curl -X POST http://localhost:8000/api/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "alert_type": "flood_warning",
    "severity": "high"
  }'

# Frontend should:
# 1. Show toast notification
# 2. Add alert to list
# 3. Update unread count
```

### ✅ Test 3: Update Alert Status
```bash
# Update alert to 'active'
curl -X PUT http://localhost:8000/api/alerts/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# Frontend should:
# 1. Alert status changes instantly
# 2. UI reflects new status
```

### ✅ Test 4: Resolve Alert
```bash
# Resolve alert
curl -X PUT http://localhost:8000/api/alerts/1/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'

# Frontend should:
# 1. Show success notification
# 2. Remove alert from list (or mark as resolved)
# 3. Trigger custom event 'aegis:alert:resolved'
```

### ✅ Test 5: Location Filtering
```bash
# User: citizen in district 1
# Create alert for district 1,2
# GET /api/alerts

# Should return only alerts for district 1
# Admin users see all alerts regardless of location
```

---

## 🐛 Troubleshooting

### Problem: WebSocket connection fails
```
❌ Error: "Failed to connect to Reverb"
```
**Solution:**
1. Check Reverb is running: `ps aux | grep reverb`
2. Check port 8080 is free: `lsof -i :8080`
3. Check env vars match in backend + frontend
4. Check browser Network tab for ws:// connection

### Problem: Alerts don't update in real-time
```
❌ Alert created but not visible until page refresh
```
**Solution:**
1. Check RealtimeContext connected: `window.Echo.connector.socket.state`
2. Check browser console for errors
3. Check backend logs: `tail -f storage/logs/laravel.log`
4. Verify AlertCreated event is being dispatched

### Problem: Geometry not showing on map
```
❌ Alert geometry is null
```
**Solution:**
1. Check PostgreSQL is being used (not SQLite)
2. Check geometry column has data:
   ```sql
   SELECT ST_AsGeoJSON(geometry) FROM alerts WHERE id = 1;
   ```
3. Check broadcastWith() includes geometry
4. Check frontend receives geometry in event

### Problem: Citizens see all alerts
```
❌ Location filtering not working
```
**Solution:**
1. Check user.district_id is set
2. Check user has role 'citizen'
3. Check alert.affected_districts populated
4. Check query logic in AlertController::index()

### Problem: WebSocket keeps disconnecting
```
❌ Connection drops every 30 seconds
```
**Solution:**
1. Check firewall not blocking WebSocket
2. Check proxy settings
3. Check Reverb error logs
4. Try: `php artisan reverb:start --debug`

---

## 📊 Event Data Format

### AlertCreated Event
```json
{
  "id": 1,
  "alert_number": "ALT-20260424-ABC1",
  "title": "Mưa lớn",
  "description": "Dự báo mưa lớn từ 14h",
  "alert_type": "flood_warning",
  "severity": "high",
  "status": "active",
  "geometry": { /* GeoJSON */ },
  "affected_districts": ["1", "2"],
  "effective_from": "2026-04-24T14:00:00Z",
  "effective_until": "2026-04-24T20:00:00Z",
  "created_at": "2026-04-24T13:30:00Z"
}
```

### AlertUpdated Event
```json
{
  "id": 1,
  "alert_number": "ALT-20260424-ABC1",
  "title": "Mưa lớn",
  "status": "updated",
  "updated_at": "2026-04-24T13:45:00Z"
}
```

### AlertResolved Event
```json
{
  "id": 1,
  "alert_number": "ALT-20260424-ABC1",
  "title": "Mưa lớn",
  "status": "resolved",
  "resolved_by": 5,
  "resolved_at": "2026-04-24T19:00:00Z",
  "updated_at": "2026-04-24T19:00:00Z"
}
```

---

## 💾 Files Modified

### Backend
- ✅ `app/Events/AlertCreated.php` - Enhanced
- ✅ `app/Events/AlertUpdated.php` - NEW
- ✅ `app/Events/AlertResolved.php` - NEW
- ✅ `app/Http/Controllers/Api/AlertController.php` - Broadcast + filter
- ✅ `routes/channels.php` - Define 'flood' channel
- ✅ `database/migrations/2026_04_24_000000_add_district_id_to_users_table.php` - NEW

### Frontend
- ✅ `src/lib/realtime-context.tsx` - Enhanced listeners
- ✅ `src/lib/useAlertEvents.ts` - NEW custom hook
- ✅ `src/components/realtime/AlertListener.tsx` - NEW example component

---

## ✨ Usage in Components

### Simple Alert List Component
```typescript
'use client';
import { useState } from 'react';
import { useAlertEvents } from '@/lib/useAlertEvents';

export function AlertList() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useAlertEvents({
    onAlertCreated: (data) => {
      setAlerts(prev => [data, ...prev]);
    },
    onAlertUpdated: (data) => {
      setAlerts(prev =>
        prev.map(a => a.id === data.id ? {...a, ...data} : a)
      );
    },
    onAlertResolved: (data) => {
      setAlerts(prev => prev.filter(a => a.id !== data.id));
    },
  });

  return (
    <div>
      {alerts.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <p>{alert.description}</p>
          <span>{alert.severity}</span>
        </div>
      ))}
    </div>
  );
}
```

### With Toast Notifications
```typescript
import { toast } from 'sonner';

useAlertEvents({
  onAlertCreated: (data) => {
    toast.warning(`🚨 ${data.title}`, {
      description: data.description,
    });
  },
  onAlertResolved: (data) => {
    toast.success(`✅ ${data.alert_number} đã được giải quyết`);
  },
});
```

---

## 🎓 Learn More

- 📖 [Laravel Broadcasting Docs](https://laravel.com/docs/broadcasting)
- 📖 [Reverb Documentation](https://reverb.laravel.com/)
- 📖 [Laravel Echo](https://laravel.com/docs/echo)
- 📖 [Next.js Real-time Patterns](https://nextjs.org/docs)

---

## 🚀 Production Deployment

### Before Going Live
1. [ ] Change REVERB_SCHEME to 'https' (for HTTPS)
2. [ ] Use Redis for broadcasting (not local)
3. [ ] Enable channel authentication (optional)
4. [ ] Add rate limiting for alert creation
5. [ ] Test with load: 100+ concurrent connections
6. [ ] Monitor WebSocket memory usage
7. [ ] Setup backups for alert history

### Production Commands
```bash
# Build frontend
yarn build

# Start Reverb in production
php artisan reverb:start --port=8080 --force-ssl

# Monitor Reverb connections
php artisan tinker
>>> \App\Models\Alert::count()  // Check alerts
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `storage/logs/laravel.log`
2. Check browser console for JS errors
3. Check WebSocket connection: DevTools → Network → WS
4. Check env variables match

For detailed documentation, see:
- `.claude/alert-realtime-implementation.md`
- `.claude/alert-realtime-analysis.md`
- `.claude/ALERT_REALTIME_CHECKLIST.md`
