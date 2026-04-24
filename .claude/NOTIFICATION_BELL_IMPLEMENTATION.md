# Notification Bell Implementation - Role-aware Dropdown

## Completed Changes

### Step 1: Modified `NotificationBell.tsx`
**File**: `frontend/src/components/notification/NotificationBell.tsx`

#### Added:
1. **Helper Functions**:
   - `getLinkByRole(type, data, role)` - Maps notification types to role-specific links
     - citizen → `/citizen`
     - rescue_team → `/team/requests` or `/team/requests/{id}`
     - admin roles → `/dashboard/incidents/{id}`, `/dashboard/alerts`, etc.
   
   - `getAllLink(role)` - Returns "view all" link based on role
     - citizen → `/citizen`
     - rescue_team → `/team/requests`
     - admins → `/dashboard/notifications`

2. **Role-aware Notifications**:
   - Changed all event handlers (`handleIncidentCreated`, `handleAlertCreated`, `handleRescueCreated`, `handlePredictionReceived`) to use `getLinkByRole()`
   - Each notification now includes `read: false` and `timestamp: new Date()`

3. **Removed Auto-open**:
   - Deleted auto-open dropdown when notification arrives (only bell animates)

4. **Added Footer**:
   - "Xem tất cả thông báo" button that navigates to role-specific page

### Step 2: Modified `header.tsx`
**File**: `frontend/src/components/layout/header/header.tsx`

#### Removed:
1. `unreadAlerts` state
2. Event listeners for `aegis:alert:created` and `aegis:alert:resolved`
3. Bell icon import from lucide-react
4. Bell Link component with hardcoded `/dashboard/alerts`

#### Added:
1. `NotificationBell` import
2. `<NotificationBell />` component in desktop actions

## Link Routing by Role

| Role | Alert | Incident | Rescue | "View All" |
|------|-------|----------|--------|-----------|
| citizen | /citizen | /citizen | /citizen | /citizen |
| rescue_team | /team/requests | /team/requests/:id | /team/requests/:id | /team/requests |
| city_admin, rescue_operator, ai_operator, urban_planner | /dashboard/alerts | /dashboard/incidents/:id | /dashboard/rescue-requests | /dashboard/notifications |

## Features

### Dropdown UI
- ✅ Click bell to toggle dropdown (not navigate)
- ✅ Click outside to close
- ✅ Shows up to 50 notifications
- ✅ Mark as read / Mark all read
- ✅ Clear all

### Real-time Updates
- ✅ Listens to `aegis:incident:created`
- ✅ Listens to `aegis:alert:created`
- ✅ Listens to `aegis:rescue_request:created`
- ✅ Listens to `aegis:prediction:received`
- ✅ Bell animates on new notification

### Role-aware Navigation
- ✅ Click notification → navigates to role-appropriate page
- ✅ Click "View all" → navigates to role-appropriate page
- ✅ Reads role from `useAuth()` hook

## Testing

1. **Login as citizen**:
   - Create alert → Should appear in dropdown
   - Click notification → Navigate to `/citizen`
   - Click "View all" → Navigate to `/citizen`

2. **Login as rescue_team**:
   - Create incident → Should appear in dropdown
   - Click notification → Navigate to `/team/requests/{id}`
   - Click "View all" → Navigate to `/team/requests`

3. **Login as admin role (city_admin, rescue_operator, ai_operator)**:
   - Create alert → Should appear in dropdown
   - Click notification → Navigate to `/dashboard/alerts`
   - Click "View all" → Navigate to `/dashboard/notifications`

## Usage

To test the implementation:

```bash
# Start all services
./run_all.sh

# Open http://localhost:3000 in browser
# Login with test credentials

# In another terminal, create a test alert
./test-notification.sh

# Check browser console for:
# [RealtimeListener] 🔔 AlertCreated received: ...

# Verify:
# 1. Bell icon animates
# 2. Dropdown shows notification
# 3. Clicking notification navigates correctly
# 4. "View all" button works correctly
```

## Notes

- Notifications are only displayed for 1-2 seconds in the NotificationBell dropdown
- Toast notifications still display separately via `RealtimeListener` based on severity/role
- The dropdown does NOT auto-open when notification arrives (only bell animates)
- Notification timestamps use browser `new Date()` (should consider using server timestamp in future)
