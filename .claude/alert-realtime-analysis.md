# Phân Tích Alert Real-Time Flow

## 📋 Tổng Quan

Hệ thống gửi cảnh báo lũ lụt real-time từ Backend → Reverb WebSocket → Frontend qua kênh `flood` công khai.

---

## ✅ Điểm Mạnh

### 1. **Architecture Đơn Giản & Hợp Lý**
- ✅ Sử dụng Reverb (Laravel native WebSocket) thay vì dùng Pusher bên ngoài
- ✅ Event-driven: Tự động dispatch event khi create alert
- ✅ Frontend lắng nghe trên channel `flood` công khai (phù hợp alerts công cộng)

### 2. **Data Integrity Tốt**
- ✅ Lưu đầy đủ thông tin: title, description, severity, geometry, affected areas
- ✅ Tracking: issued_by, resolved_by, created_at, resolved_at
- ✅ Validation: status enum, alert_type enum, affected_districts exists

### 3. **State Management**
- ✅ RealtimeContext cập nhật state: `lastAlert`, `unreadCount`
- ✅ Track connection status
- ✅ Cleanup listeners khi unmount

### 4. **Geometry Support**
- ✅ PostGIS geometry cho bản đồ (khi dùng PostgreSQL)
- ✅ GeoJSON endpoint cho map visualization

---

## ⚠️ Vấn Đề & Thiếu Sót (CRITICAL)

### 1. **❌ MISSING: AlertUpdated Event**
**Vấn Đề:** Khi cảnh báo được cập nhật trạng thái (`draft` → `active` → `updated` → `resolved`), **KHÔNG có event broadcast**
- **Code tại:** `AlertController::updateStatus()` line 128-148
  ```php
  public function updateStatus(Request $request, int $id)
  {
      // ...
      if ($data['status'] === AlertStatusEnum::RESOLVED->value) {
          $alert->resolve($user->id);  // ❌ Chỉ cập nhật DB, không broadcast
      } else {
          $alert->update(['status' => $data['status']]);  // ❌ Chỉ cập nhật DB, không broadcast
      }
      return ApiResponse::success(new AlertResource($alert->fresh()), 'Cập nhật trạng thái thành công');
      // ❌ MISSING: broadcast(new AlertUpdated(...))
  }
  ```

**Hậu quả:**
- Admins đã giải quyết cảnh báo → **người dân vẫn thấy cảnh báo cũ trên app**
- Alerts được "updated" → **Frontend không biết để cập nhật lại giao diện**
- Không có real-time feedback khi operator thay đổi status

**Ví dụ tình huống:**
1. Mưa dừng → Operator chuyển alert từ `active` → `resolved`
2. Bên backend: DB được cập nhật ✅
3. Bên frontend: Người dân vẫn thấy cảnh báo cảnh báo → **UX xấu** ❌

### 2. **❌ MISSING: AlertResolved Event**
Tương tự như trên, không có event riêng cho trường hợp resolve. Dù có AlertUpdated cũng nên có AlertResolved để:
- Trigger notification cụ thể ("Cảnh báo đã được giải quyết")
- Dễ handle logic khác nhau (update UI khác nhau cho resolve vs. draft)

### 3. **❌ Frontend chỉ nghe AlertCreated**
**Code tại:** `realtime-context.tsx` line 68-75
```typescript
channel.listen('.alert.created', (data: any) => {
  setState(prev => ({
    ...prev,
    connected: true,
    lastAlert: data,
    unreadCount: prev.unreadCount + 1,
  }));
});
```

**Vấn đề:** Chỉ nghe `.alert.created` → **không nghe updates hoặc resolves**

Frontend cần nghe thêm:
```typescript
// ❌ MISSING:
channel.listen('.alert.updated', (data: any) => {
  // Cập nhật UI alert đã được thay đổi
  setAlerts(prev => prev.map(a => a.id === data.id ? data : a));
});

channel.listen('.alert.resolved', (data: any) => {
  // Ẩn alert hoặc đánh dấu as resolved
  removeAlert(data.id);
  toast.success('Cảnh báo đã được giải quyết');
});
```

### 4. **❌ Không xử lý Channel Subscription Auth**
**Vấn đề:** Channel `flood` là **public** (bất cứ ai cũng có thể nghe)
```php
// routes/channels.php - KHÔNG CÓ định nghĩa cho channel 'flood'
```

**Hậu quả:**
- ✅ Tốt cho alerts công cộng (tất cả người dân có thể nhận)
- ⚠️ Nhưng KHÔNG có bảo mật — bất cứ client nào cũng có thể nghe được toàn bộ alerts

**Dùng private channel nếu cần kiểm soát:**
```php
// routes/channels.php
Broadcast::channel('alerts.public', function ($user) {
    return true;  // Hoặc: return $user !== null (chỉ logged-in users)
});
```

Hoặc **private channel cho alert specific**:
```php
Broadcast::channel('alert.{alertId}', function ($user, $alertId) {
    $alert = Alert::find($alertId);
    // Kiểm tra user có quyền xem alert này không
    return $alert && $alert->isVisibleTo($user);
});
```

### 5. **❌ GeometryMissing trong Broadcast**
**Code tại:** `AlertCreated::broadcastWith()` line 41-56
```php
public function broadcastWith(): array
{
    return [
        'id' => $this->alert->id,
        'title' => $this->alert->title,
        // ...
        'created_at' => $this->alert->created_at?->toIso8601String(),
        // ❌ MISSING: 'geometry' => ...
    ];
}
```

**Vấn đề:**
- Alert có `geometry` (PostGIS) nhưng không được broadcast
- Frontend phải gọi `/api/public/alerts/geojson` riêng để lấy hình dạng
- **Không real-time** — Map phải refetch data

**Cần thêm:**
```php
public function broadcastWith(): array
{
    $geometry = null;
    if (DB::connection()->getDriverName() === 'pgsql') {
        $result = DB::selectOne(
            "SELECT ST_AsGeoJSON(geometry) as geojson FROM alerts WHERE id = ?",
            [$this->alert->id]
        );
        $geometry = $result?->geojson ? json_decode($result->geojson) : null;
    }
    
    return [
        // ... existing fields ...
        'geometry' => $geometry,  // ✅ Thêm geometry
    ];
}
```

### 6. **⚠️ No Scope-Based Authorization**
**Code tại:** `AlertController::geojson()` & index()
```php
public function geojson()
{
    $alerts = Alert::active()->get();  // ⚠️ Lấy TẤT CẢ active alerts
    // Không kiểm tra: affected_districts, user location, etc.
}
```

**Vấn đề:**
- Trả về tất cả alerts cho tất cả users (không filter theo vị trí của user)
- Người dân ở Hà Nội vẫn nhận cảnh báo từ Hồ Chí Minh (không cần thiết)

**Nên thêm filtering:**
```php
public function geojson(Request $request)
{
    $query = Alert::active();
    
    // Nếu user là citizen, chỉ show alerts ở district của họ
    if ($request->user()?->hasRole('citizen')) {
        $districts = $request->user()->location_districts ?? [];
        if ($districts) {
            $query->whereJsonContains('affected_districts', $districts);
        }
    }
    
    return $query->get();
}
```

### 7. **❌ No Error Handling trong Frontend Broadcast**
**Code tại:** `realtime-context.tsx` line 99-101
```typescript
} catch (err) {
    console.error('[RealtimeProvider] ❌ Failed to connect:', err);
    // ❌ MISSING: reconnect logic, user notification, fallback polling
}
```

**Vấn đề:**
- Nếu WebSocket fail → app vẫn chạy nhưng **không nhận được realtime updates**
- User không biết
- Không có fallback để polling API

**Cần:**
```typescript
catch (err) {
    console.error('[RealtimeProvider] ❌ Failed to connect:', err);
    setState(prev => ({ ...prev, connected: false, error: err.message }));
    // Retry logic
    setTimeout(setupListeners, 5000);  // Retry after 5s
    // Hoặc: Fallback to polling API
}
```

---

## 📊 Comparison: Current vs. Ideal State

| Feature | Current | Ideal | Status |
|---------|---------|-------|--------|
| Alert Create broadcast | ✅ Yes | ✅ Yes | ✅ OK |
| Alert Update broadcast | ❌ No | ✅ Yes | ⚠️ Missing |
| Alert Resolve broadcast | ❌ No | ✅ Yes | ⚠️ Missing |
| Frontend listens updates | ❌ No | ✅ Yes | ⚠️ Missing |
| Geometry in broadcast | ❌ No | ✅ Yes | ⚠️ Missing |
| Channel auth check | ⚠️ Public | ✅ Configurable | ⚠️ Risky |
| Location-based filtering | ❌ No | ✅ Yes | ⚠️ Missing |
| Reconnect + fallback | ❌ No | ✅ Yes | ⚠️ Missing |

---

## 🔧 Fix Priority

### 🔴 **P0 - CRITICAL (Block Deployment)**
1. **Add AlertUpdated event** + broadcast in `updateStatus()`
2. **Frontend listen to `.alert.updated`** + update state/UI
3. **Add fallback WebSocket reconnect** in realtime-context

### 🟠 **P1 - HIGH (Do Soon)**
4. **Add AlertResolved event** + separate logic
5. **Include geometry in broadcast** (or separate GeoJSON broadcast)
6. **Add location filtering** in geojson/list endpoints

### 🟡 **P2 - MEDIUM (Nice to Have)**
7. **Scope alerts by affected_districts** for citizen users
8. **Add channel authentication** in routes/channels.php
9. **User-friendly error messages** when WebSocket fails

---

## 📝 Recommended Implementation

### Backend: Create AlertUpdated Event
```php
<?php
namespace App\Events;

use App\Models\Alert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AlertUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Alert $alert) {}

    public function broadcastOn(): array
    {
        return [new Channel('flood')];
    }

    public function broadcastAs(): string
    {
        return 'AlertUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->alert->id,
            'status' => $this->alert->status,
            'updated_at' => $this->alert->updated_at?->toIso8601String(),
        ];
    }
}
```

### Backend: Update AlertController
```php
public function updateStatus(Request $request, int $id)
{
    $alert = Alert::find($id);
    if (!$alert) return ApiResponse::notFound('Alert not found');

    $data = $request->validate([
        'status' => 'required|in:' . implode(',', AlertStatusEnum::values()),
    ]);

    if ($data['status'] === AlertStatusEnum::RESOLVED->value) {
        $alert->resolve($request->user()->id);
        broadcast(new AlertResolved($alert->fresh()))->toOthers();  // ✅ Broadcast
    } else {
        $alert->update(['status' => $data['status']]);
        broadcast(new AlertUpdated($alert->fresh()))->toOthers();  // ✅ Broadcast
    }

    return ApiResponse::success(new AlertResource($alert->fresh()));
}
```

### Frontend: Update RealtimeContext
```typescript
useEffect(() => {
    // ... setup code ...
    
    channel.listen('.alert.updated', (data: any) => {
        setState(prev => ({
            ...prev,
            lastAlert: data,
            connected: true,
        }));
        window.dispatchEvent(new CustomEvent('aegis:alert:updated', { detail: data }));
    });

    channel.listen('.alert.resolved', (data: any) => {
        setState(prev => ({
            ...prev,
            lastAlert: { ...data, resolved: true },
            connected: true,
        }));
        window.dispatchEvent(new CustomEvent('aegis:alert:resolved', { detail: data }));
    });
    
    // ... cleanup code ...
}, [token]);
```

---

## 🎯 Kết Luận

**Luồng alert real-time của bạn có logic tốt nhưng CHƯA HOÀN CHỈNH:**

✅ **Tốt:**
- Kiến trúc event-driven sạch
- Create alert broadcast được implement
- Frontend có realtime context

❌ **Cần cải thiện:**
- **UPDATE & RESOLVE không broadcast** → Frontend không biết trạng thái mới
- **Geometry không broadcast** → Map phải refetch
- **Không có reconnect logic** → WebSocket disconnect = mất realtime
- **Không filter alerts** → Người dùng nhận alerts không liên quan

Nếu bỏ qua những vấn đề này, khi operator **resolve alerts thì citizens vẫn nhận cảnh báo cũ** — **logic nghiệp vụ sai!**
