# Alert Real-Time Implementation Checklist

## ✅ Completed Items

### Backend Events (Laravel)
- [x] AlertCreated.php - Include geometry & affected areas
- [x] AlertUpdated.php (NEW)
- [x] AlertResolved.php (NEW)

### Backend Controller
- [x] AlertController::store() - broadcast(AlertCreated)
- [x] AlertController::updateStatus() - broadcast(AlertUpdated/Resolved)
- [x] AlertController::index() - Location filtering for citizens
- [x] AlertController::geojson() - Location filtering for citizens

### Backend Routes & Channels
- [x] routes/channels.php - Define 'flood' channel

### Frontend Hooks & Utilities
- [x] lib/realtime-context.tsx - Enhanced with update/resolved listeners
- [x] lib/useAlertEvents.ts - NEW custom hook
- [x] components/realtime/AlertListener.tsx - NEW example component

### Database
- [x] Migration: add_district_id_to_users_table

### Documentation
- [x] .claude/alert-realtime-analysis.md - Detailed analysis
- [x] .claude/alert-realtime-implementation.md - Implementation guide

---

## ⏳ TODO: Integration Steps

### 1. **Run Database Migrations**
```bash
cd backend
php artisan migrate
```
✓ Adds `district_id` to users table
✓ Creates FK to districts table

### 2. **Test Backend Events**
```bash
# Terminal 1: Start Reverb WebSocket
cd backend
php artisan reverb:start --port=8080

# Terminal 2: Create test alert (check broadcaster)
php artisan tinker
>>> $alert = Alert::create(['title' => 'Test', ...])
>>> event(new AlertCreated($alert))  // Verify broadcast
```

### 3. **Test Frontend Listeners**
```bash
# Terminal 1: Start frontend dev server
cd frontend
yarn dev

# Browser Console:
// Check WebSocket connection
window.Echo.connector.socket.state

// Listen for events
window.Echo.channel('flood').listen('.alert.created', d => console.log(d))
```

### 4. **Update Component Usage**
- [ ] Add AlertListener to root layout/provider
- [ ] Update alert list component to use useAlertEvents
- [ ] Update map component to handle geometry updates
- [ ] Add toast notifications for alert events
- [ ] Add reconnect button for WebSocket errors

### 5. **User Model Relationship** (if needed)
```php
// app/Models/User.php
public function district()
{
    return $this->belongsTo(District::class);
}
```

### 6. **Test Full Flow**
**Scenario 1: Create & View Alert**
```bash
# Backend: Create alert in district 1
POST /api/alerts
{
  "title": "Mưa lớn",
  "alert_type": "flood_warning",
  "severity": "high",
  "affected_districts": ["1"]
}
✓ Frontend WebSocket receives AlertCreated event
✓ Alert appears in list instantly
```

**Scenario 2: Update Alert Status**
```bash
# Backend: Change status to active
PUT /api/alerts/1/status
{ "status": "active" }
✓ Frontend WebSocket receives AlertUpdated event
✓ Alert status updates without page reload
```

**Scenario 3: Resolve Alert**
```bash
# Backend: Resolve alert
PUT /api/alerts/1/status
{ "status": "resolved" }
✓ Frontend WebSocket receives AlertResolved event
✓ Alert removed from list / marked as resolved
✓ Toast: "Alert ALT-20260424-ABC1 resolved"
```

**Scenario 4: Citizen Location Filtering**
```bash
# User: citizen in district 1
# Alert: created for districts 1,2,3
# GET /api/alerts
✓ Returns alerts for districts [1] only (matched)
# If alert for district 2 only
✓ Returns empty (not matched)
```

---

## 📋 Files Changed/Created Summary

### Backend (Laravel)
| File | Status | Change |
|------|--------|--------|
| app/Events/AlertUpdated.php | ✅ NEW | New event class |
| app/Events/AlertResolved.php | ✅ NEW | New event class |
| app/Events/AlertCreated.php | ✅ MODIFIED | Add geometry + areas |
| app/Http/Controllers/Api/AlertController.php | ✅ MODIFIED | Broadcast + filtering |
| routes/channels.php | ✅ MODIFIED | Define 'flood' channel |
| database/migrations/2026_04_24_000000_add_district_id_to_users_table.php | ✅ NEW | Add district_id column |

### Frontend (Next.js)
| File | Status | Change |
|------|--------|--------|
| src/lib/realtime-context.tsx | ✅ MODIFIED | Listen to updated/resolved |
| src/lib/useAlertEvents.ts | ✅ NEW | Custom hook for events |
| src/components/realtime/AlertListener.tsx | ✅ NEW | Example component |

### Documentation
| File | Status |
|------|--------|
| .claude/alert-realtime-analysis.md | ✅ NEW |
| .claude/alert-realtime-implementation.md | ✅ NEW |
| .claude/ALERT_REALTIME_CHECKLIST.md | ✅ NEW |

---

## 🔍 Code Review Checklist

### Backend
- [ ] AlertUpdated & AlertResolved events have proper structure
- [ ] broadcastWith() returns all needed data
- [ ] AlertController broadcast calls use ->toOthers()
- [ ] Location filtering logic correct (citizen only)
- [ ] geojson() applies same filtering as index()
- [ ] channels.php defines 'flood' channel
- [ ] No SQL N+1 queries in filtering

### Frontend
- [ ] RealtimeContext listens all 3 events
- [ ] Cleanup function removes all listeners
- [ ] Reconnect logic works after 5 seconds
- [ ] useAlertEvents hook properly manages dependencies
- [ ] AlertListener component exports correct
- [ ] CustomEvents dispatch properly
- [ ] No memory leaks on unmount

### Database
- [ ] Migration uses correct timestamp format
- [ ] FK constraint correct (district_id → districts.id)
- [ ] Migration can be reversed without errors

---

## 🚀 Deployment Checklist

- [ ] All files committed to git
- [ ] No console.log() in production code
- [ ] Tested with PostgreSQL geometry (if using)
- [ ] Tested with SQLite (if dev only)
- [ ] WebSocket firewall rules checked
- [ ] NEXT_PUBLIC_REVERB_* env vars set
- [ ] Database migration runs successfully
- [ ] No breaking changes to existing alerts
- [ ] Load test: 100+ concurrent WebSocket connections

---

## 🐛 Known Issues & Workarounds

### Issue 1: WebSocket fails with "Cannot find module Pusher"
**Solution:** Check `NEXT_PUBLIC_REVERB_KEY` env var is set

### Issue 2: Geometry is null even with PostGIS
**Solution:** Check geometry column has spatial data:
```sql
SELECT ST_AsGeoJSON(geometry) FROM alerts WHERE id = 1;
```

### Issue 3: Citizen sees all alerts, not filtered
**Solution:** Check:
1. User has role 'citizen'
2. User has district_id set
3. Alert has affected_districts populated
4. Query filter logic in controller

### Issue 4: Reconnect keeps retrying forever
**Solution:** Add max retries:
```typescript
// In realtime-context.tsx
retryCount = 0
if (retryCount < 10) {
  setTimeout(setupListeners, 5000);
  retryCount++;
}
```

---

## 📞 Support & Questions

For issues or questions:
1. Check alert-realtime-implementation.md for usage
2. Check browser WebSocket in DevTools
3. Check backend logs: `php artisan tinker` → test broadcast
4. Check Reverb connection: `ps aux | grep reverb`

---

## ✨ Next Steps (Future Improvements)

1. **Encrypted Channels** - For sensitive data
2. **Rate Limiting** - Prevent alert spam
3. **Polling Fallback** - If WebSocket unavailable
4. **Alert Deduplication** - Prevent duplicate alerts in list
5. **Archive Old Alerts** - Cleanup after 30 days
6. **Metrics** - Track alert response time
7. **Multi-language** - Alert titles in multiple languages
8. **Attachments** - Support images/documents in alerts
