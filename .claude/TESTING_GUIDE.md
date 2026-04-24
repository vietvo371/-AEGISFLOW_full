# Testing Guide - Notification Bell Dropdown

## Setup

```bash
# Start all services
./run_all.sh

# OR start individually in separate terminals:
./run_all.sh backend    # Terminal 1 - Laravel on :8000
./run_all.sh frontend   # Terminal 2 - Next.js on :3000
./run_all.sh reverb     # Terminal 3 - WebSocket on :8080
```

## Quick Test (Simple)

```bash
# In another terminal, run simple test
./test-simple.sh
```

This creates 2 alerts (HIGH and CRITICAL severity) and tests:
- ✅ Bell icon animates 2 times
- ✅ 2 toast notifications appear (top-right)
- ✅ Dropdown shows 2 notifications
- ✅ No auto-open on notification

## Full Test (All Events)

```bash
./test_realtime_flow.sh
```

This creates:
1. Incident (tests incident.created event)
2. Alert (tests alert.created event)
3. Rescue Request (tests rescue_request.created)
4. Updates Rescue Request (tests rescue_request.updated)
5. Resolves Incident (tests incident.resolved)

## Manual UI Testing

### Step 1: Open Browser
- Go to http://localhost:3000
- Login with test credentials (email: admin@aegisflow.ai, password: password)

### Step 2: Check Header
- Bell icon should be visible in top-right of header
- Badge shows unread count

### Step 3: Create Test Alert
```bash
./test-simple.sh
```

### Step 4: Observe UI
- **Bell animates**: Icon bounces briefly
- **Toast notification**: Appears top-right with alert details
- **Dropdown**: Click bell to see dropdown with notifications
- **No auto-open**: Dropdown does NOT open automatically
- **Mark as read**: Unread notifications have red dot

### Step 5: Test Navigation
- **Click notification**: Navigate to role-appropriate page
  - Admin → /dashboard/alerts
  - Citizen → /citizen
  - Rescue Team → /team/requests
- **Click "Xem tất cả"**: Navigate to role-appropriate page

## Browser Console

Open browser DevTools (F12) and check Console tab for:

```javascript
[RealtimeListener] 🔌 Connecting to Reverb...
[RealtimeListener] ✅ Subscribed to channel: flood
[RealtimeListener] 🔔 AlertCreated received: { id: 1, title: "...", ... }
```

## Test Scenarios by Role

### As Admin (city_admin)
1. Create alert → Toast + dropdown notification
2. Click notification → Navigate to `/dashboard/alerts`
3. Click "View all" → Navigate to `/dashboard/notifications`

### As Citizen
1. Create alert → Toast (if severity is high/critical)
2. Click notification → Navigate to `/citizen`
3. No "View all" button (if 0 notifications)

### As Rescue Team
1. Create incident → Toast (if urgent)
2. Click notification → Navigate to `/team/requests/{id}`
3. Click "View all" → Navigate to `/team/requests`

## Troubleshooting

### Notifications not appearing
1. Check browser console for errors
2. Verify WebSocket connection: Look for "✅ Subscribed to channel: flood"
3. Check backend is running: `curl http://localhost:8000/api/alerts`
4. Check Reverb is running: Port 8080 should be open

### Toast appearing but dropdown empty
1. Notifications might be in RealtimeListener but not NotificationBell
2. Check if both listeners are mounted
3. Verify custom event is being dispatched: `aegis:alert:created`

### Navigation wrong
1. Check user role in dropdown menu
2. Verify role matches in auth context
3. Check getLinkByRole() logic in NotificationBell.tsx

## Files to Check

- **Backend Events**: `backend/app/Events/AlertCreated.php`
- **Frontend Listener**: `frontend/src/components/realtime/RealtimeListener.tsx`
- **Frontend Dropdown**: `frontend/src/components/notification/NotificationBell.tsx`
- **Header**: `frontend/src/components/layout/header/header.tsx`
- **WebSocket Routes**: `backend/routes/channels.php`

## Performance Notes

- Max 50 notifications stored in dropdown
- Timestamps calculated client-side (consider server-side in production)
- Toast timeout: 5-10 seconds depending on severity
- Animation duration: 600ms for bell bounce
