# 🎯 Task #5, #6, #7 - Detailed Implementation Plan

**Focus**: Form Validation, Team Map, Citizen Route  
**Total Time**: ~12 hours  
**Priority**: HIGH  
**Status**: In Progress

---

## 📋 Current State Analysis

### Task #5 - Form Validation ✏️

**Current Status**: Forms exist but NO validation feedback
- ✅ Forms built (signup, citizen request, etc.)
- ❌ No Zod validation
- ❌ No error messages displayed
- ❌ No loading states during submission
- ❌ No toast error feedback

**Files to modify**:
```
frontend/src/app/
├── (auth)/signup/page.tsx          ← Form exists, needs validation
├── (auth)/signin/page.tsx          ← Form exists, needs validation
├── citizen/request/page.tsx        ← Form exists, needs validation
└── dashboard/incidents/page.tsx    ← Likely form exists
```

**What's Missing**:
1. ❌ Zod schema for validation
2. ❌ Error state management
3. ❌ Error message display
4. ❌ Loading spinners (Loader2 icon used but not in form state)
5. ❌ Field-level validation feedback

---

### Task #6 - Team Map Interactivity 🗺️

**Current Status**: Map loads but unclear if interactive
- ✅ `/team/map` page exists
- ✅ Uses MapComponent (dynamic import)
- ❌ Unclear what data displays on map
- ❌ Unknown if rescue requests show up
- ❌ Unknown if team can accept/reject from map
- ❌ Unknown if real-time updates work

**What needs verification**:
1. Map loads at all?
2. Rescue requests show up as pins?
3. Can click rescue request for details?
4. Can accept/reject/start/complete from map?
5. Real-time updates work (WebSocket)?

**MapComponent location**: `frontend/src/components/map/MapComponent.tsx`

---

### Task #7 - Citizen Evacuation Route 🚦

**Current Status**: Partial - shows shelters but evacuation route unclear
- ✅ `/citizen/map` page exists
- ✅ Fetches shelters from API
- ✅ Shows shelter tabs
- ✅ Has GPS location button
- ❌ Evacuation route calculation: unclear if working
- ❌ Route visualization: unclear if showing on map
- ❌ ETA display: uncertain
- ❌ Real-time flooding zone updates: uncertain

**What needs verification**:
1. Does flooding zones show on map?
2. Does evacuation route display when shelter selected?
3. Does route update in real-time?
4. Are shelter capacities correct?
5. Is ETA accurate?

---

## 🔧 Implementation Plan

### Phase 1: Task #5 - Form Validation (4-5 hours)

#### Step 1: Install Zod & setup validation (30 min)
```bash
cd frontend
npm install zod
```

#### Step 2: Create validation schemas (1 hour)
Create `src/lib/validations/auth.ts`:
```typescript
import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export const rescueRequestSchema = z.object({
  caller_name: z.string().min(2, 'Name required'),
  caller_phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  people_count: z.number().min(1, 'At least 1 person'),
  description: z.string().optional(),
});
```

#### Step 3: Update signup form with validation (1.5 hours)
Update `frontend/src/app/(auth)/signup/page.tsx`:
```typescript
'use client';
import { z } from 'zod';
import { signUpSchema } from '@/lib/validations/auth';

export default function SignUpPage() {
  const [formData, setFormData] = React.useState({...});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    
    try {
      // Validate with Zod
      const validated = signUpSchema.parse(formData);
      setIsLoading(true);
      
      const api = (await import('@/lib/api')).default;
      const res = await api.post('/auth/register', validated);
      
      if (res.data?.success) {
        toast.success('Đăng ký thành công!');
        window.location.href = '/citizen';
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to field errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const fieldName = err.path[0] as string;
          fieldErrors[fieldName] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(error.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>
      {/* Repeat for other fields */}
    </form>
  );
}
```

#### Step 4: Update signin form (1 hour)
Similar to signup - add Zod validation + error display

#### Step 5: Update citizen request form (1 hour)
Update `frontend/src/app/citizen/request/page.tsx` with validation

#### Step 6: Test all forms (30 min)
```bash
cd frontend
yarn dev
# Test:
# 1. Try submit with empty fields → Should see errors
# 2. Try invalid email → Should see error
# 3. Try mismatched passwords → Should see error
# 4. Valid data → Should submit successfully
```

---

### Phase 2: Task #6 - Team Map Interactivity (3-4 hours)

#### Step 1: Understand MapComponent (1 hour)
```bash
# Check what MapComponent does
cat frontend/src/components/map/MapComponent.tsx
```

**Questions to answer**:
- [ ] What data does it display?
- [ ] What props does it accept?
- [ ] Does it support rescue request pins?
- [ ] Can it handle click events?
- [ ] Does it listen to WebSocket?

#### Step 2: Enhance Team Map Data (1.5 hours)

Update `/team/map/page.tsx`:
```typescript
'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface RescuePin {
  id: number;
  lat: number;
  lng: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress';
  people_count: number;
  address: string;
}

export default function TeamMapPage() {
  const [rescueRequests, setRescueRequests] = useState<RescuePin[]>([]);
  
  useEffect(() => {
    // Fetch rescue requests
    const fetchRequests = async () => {
      try {
        const res = await api.get('/rescue-requests', {
          params: { status: 'pending,assigned', per_page: 100 }
        });
        
        const pins = res.data?.data?.map(req => ({
          id: req.id,
          lat: req.latitude || 16.0544,
          lng: req.longitude || 108.2022,
          urgency: req.urgency,
          status: req.status,
          people_count: req.people_count,
          address: req.address,
        })) ?? [];
        
        setRescueRequests(pins);
      } catch (e) {
        console.error('Failed to fetch rescue requests', e);
      }
    };
    
    fetchRequests();
    
    // Listen for real-time updates
    const handler = () => fetchRequests();
    window.addEventListener('aegis:rescue_request:created', handler);
    window.addEventListener('aegis:rescue_request:updated', handler);
    
    return () => {
      window.removeEventListener('aegis:rescue_request:created', handler);
      window.removeEventListener('aegis:rescue_request:updated', handler);
    };
  }, []);
  
  return (
    <div className="h-[calc(100vh-7rem)]">
      <MapComponent 
        pins={rescueRequests}
        onPinClick={(pin) => console.log('Selected:', pin)}
      />
    </div>
  );
}
```

#### Step 3: Add Accept/Reject Action (1 hour)

Add to MapComponent or in a sidebar:
```typescript
const handleAcceptRequest = async (requestId: number) => {
  try {
    await api.patch(`/rescue-requests/${requestId}`, {
      status: 'assigned',
      assigned_team_id: user.id,
    });
    toast.success('Request accepted!');
    // Refresh map
  } catch (e) {
    toast.error('Failed to accept request');
  }
};
```

#### Step 4: Test Team Map (30 min)
```bash
# 1. Start backend & frontend
php artisan serve                    # Terminal 1: Backend
yarn dev                              # Terminal 2: Frontend

# 2. Test:
# - Navigate to /team/map
# - Should see rescue requests as pins
# - Click pin → Should show details
# - Accept button should work
# - Real-time updates (create request from another client → pin appears)
```

---

### Phase 3: Task #7 - Citizen Evacuation Route (4-5 hours)

#### Step 1: Verify Current State (1 hour)

Check `frontend/src/app/citizen/map/page.tsx`:
```bash
# Questions:
# - [ ] Does MapComponent show flooding zones?
# - [ ] Does it show shelters as pins?
# - [ ] Can click shelter → shows route?
# - [ ] Does route display on map?
# - [ ] Does ETA show?
```

#### Step 2: Enhance Flooding Zone Display (1.5 hours)

Update citizen map to show flooding zones:
```typescript
useEffect(() => {
  // Fetch flood zones
  const fetchFloodZones = async () => {
    try {
      const res = await api.get('/flood-zones/geojson');
      setFloodZoneGeoJSON(res.data);
    } catch (e) {
      console.error('Failed to fetch flood zones', e);
    }
  };
  
  fetchFloodZones();
  
  // Real-time updates
  const handler = () => fetchFloodZones();
  window.addEventListener('aegis:flood_zone:updated', handler);
  
  return () => {
    window.removeEventListener('aegis:flood_zone:updated', handler);
  };
}, []);
```

#### Step 3: Improve Route Visualization (1.5 hours)

Enhance route finding:
```typescript
const handleFindRoute = async (shelter: Shelter) => {
  if (!userLocation) {
    toast.error('Please enable GPS first');
    return;
  }
  
  setRouteLoading(true);
  try {
    const result = await fetchEvacuationRoute(
      userLocation,
      shelter.location,
      'car'
    );
    
    setEvacuationRoute(result);
    setRouteInfo({
      distance: `${(result.distance / 1000).toFixed(1)} km`,
      duration: `${Math.ceil(result.duration / 60)} min`,
    });
    
    // Show on map
    mapRef.current?.showRoute(result);
    
    toast.success(`Route to ${shelter.name}: ${result.duration / 60}min`);
  } catch (e) {
    toast.error('Failed to calculate route');
  } finally {
    setRouteLoading(false);
  }
};
```

#### Step 4: Add Shelter Capacity Info (1 hour)

Show real-time shelter status:
```typescript
const getShelterBadgeColor = (shelter: Shelter) => {
  const occupancyPercent = (shelter.current_occupancy / shelter.capacity) * 100;
  if (occupancyPercent > 90) return 'bg-red-500';  // Full
  if (occupancyPercent > 70) return 'bg-orange-500'; // Nearly full
  return 'bg-green-500'; // Available
};

// Display:
<Badge className={getShelterBadgeColor(shelter)}>
  {shelter.available_beds} beds available
</Badge>
```

#### Step 5: Test Citizen Map (30 min)
```bash
# 1. Navigate to /citizen/map
# 2. Test:
#    - [ ] Map loads with shelters visible
#    - [ ] Flooding zones show on map
#    - [ ] Click "Get Location" → GPS works
#    - [ ] Select shelter → Route calculates
#    - [ ] Route shows on map with distance/ETA
#    - [ ] Shelter capacity updates in real-time
#    - [ ] Mobile responsive (test in DevTools)
```

---

## 📊 Quality Checklist

### Task #5 - Form Validation
- [ ] All form fields have Zod schemas
- [ ] Error messages display for each field
- [ ] Form validation happens before submit
- [ ] Loading spinner shows during submission
- [ ] Success toast shows after submit
- [ ] Error toast shows on failure
- [ ] Forms tested on desktop & mobile
- [ ] No console errors

### Task #6 - Team Map
- [ ] Map loads without errors
- [ ] Rescue requests display as pins
- [ ] Pin colors change based on urgency
- [ ] Can click pin to see details
- [ ] Accept/reject buttons work
- [ ] Real-time updates (create request → pin appears)
- [ ] Tested on mobile
- [ ] No console errors

### Task #7 - Citizen Route
- [ ] Map loads with shelters visible
- [ ] Flooding zones display as colored areas
- [ ] GPS location works
- [ ] Route calculation works
- [ ] Route displays on map
- [ ] Distance & ETA show correctly
- [ ] Shelter capacity updates live
- [ ] Responsive on mobile
- [ ] No console errors

---

## 🚀 Quick Commands

```bash
# Start development servers
cd backend && php artisan serve              # Terminal 1: Backend on :8000
cd frontend && yarn dev                      # Terminal 2: Frontend on :3000
php artisan reverb:start                     # Terminal 3: WebSocket on :8080
php artisan queue:work                       # Terminal 4: Queue worker

# Test a specific form
yarn dev
# Navigate to http://localhost:3000/signup
# Open DevTools Console
# Try submit with errors → should see validation messages

# Test maps
# Team: http://localhost:3000/team/map
# Citizen: http://localhost:3000/citizen/map
# Watch Network tab for WebSocket messages
```

---

## ⏱️ Time Breakdown

| Task | Component | Time |
|------|-----------|------|
| #5 | Form Validation | 4-5h |
| #6 | Team Map | 3-4h |
| #7 | Citizen Route | 4-5h |
| **Total** | | **11-14h** |

**Recommended order**:
1. Start #5 (Forms) - 4h
2. While #5 compiles, start understanding #6 & #7 (1h)
3. Complete #5 & test (1h)
4. Work on #6 (3-4h)
5. Work on #7 (4-5h)
6. Final testing & polish (1-2h)

---

## 🆘 If You Get Stuck

**Forms not validating?**
```bash
# Check Zod is installed
npm list zod

# Verify schema is imported correctly
# Use console.log to debug validation
console.log('Validation error:', error);
```

**Map not showing rescue requests?**
```bash
# Check API returns data
curl http://localhost:8000/api/rescue-requests

# Check MapComponent accepts pins prop
# Add console.log in MapComponent to debug
```

**Route not calculating?**
```bash
# Check fetchEvacuationRoute function in lib/openmap.ts
# Verify user location is set
console.log('User location:', userLocation);

# Check if shelter has location data
console.log('Shelter:', selectedShelter);
```

---

**Start with Task #5 (Forms) - it's the most straightforward!**

Generated: 2026-04-24  
Status: Ready to implement
