# 🎯 Task #5, #6, #7 - Your Focus (11-14 hours)

**Deadline**: 2026-04-28  
**Priority**: HIGH  
**Status**: In Progress ✅

---

## 📌 Overview

You've decided to focus on **Task #5, #6, #7** before other tasks. Smart choice! These are the **most visible in the demo** and will make the biggest impact.

```
Task #5: Form Validation & Error Handling        [4-5 hours] ← START HERE
Task #6: Team Map Interactivity                  [3-4 hours]
Task #7: Citizen Evacuation Route                [4-5 hours]
─────────────────────────────────────────────────────────
TOTAL                                             [11-14 hours]
```

---

## 📚 Documentation Files (In Order)

### **1. TASKS_5_6_7_DETAILED_PLAN.md** ← Read first (30 min)
- Current state analysis for each task
- What's missing & what's working
- Phase breakdown with implementation details
- Quality checklist
- Time breakdown

### **2. TASK5_FORM_VALIDATION_STEP_BY_STEP.md** ← Follow this (4-5 hours)
- Step-by-step form validation implementation
- Code snippets ready to copy-paste
- Zod schema setup
- Error display in forms
- Testing instructions

### **3. This file (TASKS_5_6_7_README.md)** ← You are here
- Quick reference & status
- Next steps

---

## 🚀 Quick Start

### **Right Now (5 min)**
```bash
# 1. Read the overview documents
cat .claude/TASKS_5_6_7_DETAILED_PLAN.md          # 30 min

# 2. Open Task #5 step-by-step guide
cat .claude/TASK5_FORM_VALIDATION_STEP_BY_STEP.md # Keep open while working
```

### **Next 4-5 hours: Task #5 - Form Validation**
```bash
# Step 1: Install Zod (5 min)
cd frontend && npm install zod

# Step 2: Create validation schemas (45 min)
# Create: frontend/src/lib/validations/auth.ts
# Create: frontend/src/lib/validations/rescue.ts

# Step 3-5: Update forms with validation
# Update: frontend/src/app/(auth)/signup/page.tsx
# Update: frontend/src/app/(auth)/signin/page.tsx
# Update: frontend/src/app/citizen/request/page.tsx

# Step 6: Test everything (30 min)
yarn dev
# Test all forms at:
# - http://localhost:3000/signup
# - http://localhost:3000/signin
# - http://localhost:3000/citizen/request
```

**Expected Result**: All forms have error messages, loading states, validation ✅

---

## 📋 What Each Task Does

### **Task #5: Form Validation** (Forms work correctly)
**Before**: Forms exist but don't validate or show errors  
**After**: 
- ✅ Zod validation on all forms
- ✅ Field error messages display
- ✅ Loading spinner during submit
- ✅ Success/error toasts
- ✅ Mobile responsive

**Impact**: Demo won't break on bad input, shows quality UX

---

### **Task #6: Team Map** (Rescue team can see requests)
**Before**: Map exists but unclear what shows  
**After**:
- ✅ Rescue requests display as pins
- ✅ Pin color = urgency level (red/orange/yellow/blue)
- ✅ Click pin → see details
- ✅ Accept/reject buttons work
- ✅ Real-time updates (WebSocket)

**Impact**: Core dispatch feature works smoothly

---

### **Task #7: Citizen Evacuation** (Citizens get evacuation info)
**Before**: Shelter list exists, route calculation unclear  
**After**:
- ✅ Flooding zones show on map
- ✅ Shelters display with capacity
- ✅ GPS location works
- ✅ Route calculates to shelter
- ✅ ETA displays correctly
- ✅ Real-time shelter updates

**Impact**: Citizens see safe evacuation paths clearly

---

## ⏱️ Recommended Timeline

### **Day 1 (Today - Apr 24): Task #5** (5-6 hours)
```
[2h]   Read docs + understand current state
[3h]   Implement form validation
[1h]   Test all forms
Result: All forms validate with error messages ✅
```

### **Day 2 (Apr 25): Task #6** (3-4 hours)
```
[1h]   Understand MapComponent
[2-3h] Add rescue request pins to team map
[1h]   Test team map interactivity
Result: Team sees rescue requests on map ✅
```

### **Day 3 (Apr 26): Task #7** (4-5 hours)
```
[1h]   Verify current citizen map state
[2h]   Add flooding zone display
[1-2h] Enhance route visualization
[1h]   Test citizen evacuation experience
Result: Citizen sees safe evacuation route ✅
```

### **Day 4 (Apr 27): Polish & Fix Issues** (2-3 hours)
```
[2-3h] Bug fixes, responsive design, final testing
Result: All 3 tasks working perfectly ✅
```

---

## 🔗 Dependencies Between Tasks

```
Task #5 (Forms) ← Independent, start first
    ↓
Task #6 (Team Map) ← Depends on forms for rescue creation
    ↓
Task #7 (Citizen Route) ← Independent, can do in parallel
```

**You can actually:**
- Start #5 (forms) on Day 1
- Start understanding #6 & #7 while working on #5
- Implement #6 & #7 in parallel after #5

---

## ✅ Success Metrics

### **Task #5 Complete When:**
- [ ] Forms have Zod validation
- [ ] All field errors display
- [ ] Loading spinner shows during submit
- [ ] Success/error toasts appear
- [ ] No console errors
- [ ] Works on mobile

### **Task #6 Complete When:**
- [ ] Map shows without errors
- [ ] Rescue requests display as pins
- [ ] Pin colors vary by urgency
- [ ] Click pin → shows details
- [ ] Accept/reject buttons work
- [ ] Real-time updates visible

### **Task #7 Complete When:**
- [ ] Map loads with shelters
- [ ] Flooding zones display
- [ ] GPS location works
- [ ] Route calculates correctly
- [ ] Distance & ETA show
- [ ] Real-time updates work
- [ ] Mobile responsive

---

## 🆘 Common Issues & Solutions

### **Task #5 Issues**

**"Zod not installing"**
```bash
npm install zod@latest
npm list zod  # Verify
```

**"Validation schema not working"**
```bash
# Add console.log to debug
try {
  const result = signUpSchema.parse(data);
  console.log('Valid:', result);
} catch (e) {
  console.error('Validation error:', e);
}
```

**"Error messages not showing"**
- Check errors state is set: `console.log('Errors:', errors);`
- Check JSX displays errors: `{errors.name && <p>{errors.name}</p>}`

---

### **Task #6 Issues**

**"Map not loading"**
```bash
# Check MapComponent exists
ls frontend/src/components/map/

# Check for console errors
yarn dev  # Watch terminal for errors
```

**"Rescue requests not showing"**
```bash
# Check API returns data
curl http://localhost:8000/api/rescue-requests

# Check React state
console.log('Rescue requests:', rescueRequests);
```

---

### **Task #7 Issues**

**"Route not calculating"**
```bash
# Check location is set
console.log('User location:', userLocation);

# Check shelter has location
console.log('Shelter:', selectedShelter);
```

**"Flooding zones not showing"**
```bash
# Check API returns GeoJSON
curl http://localhost:8000/api/flood-zones/geojson

# Check MapComponent handles GeoJSON
# May need to add layer to MapComponent
```

---

## 📞 Quick Help

**Need to understand current code?**
- Read TASKS_5_6_7_DETAILED_PLAN.md → "Current State Analysis"

**Need step-by-step implementation?**
- Follow TASK5_FORM_VALIDATION_STEP_BY_STEP.md

**Forms acting weird?**
- Open DevTools Console
- Type: `console.log('Form data:', formData);`
- Check what's in state

**Tests not working?**
```bash
# Restart dev server
yarn dev  # May have cached old code

# Clear Next.js cache
rm -rf frontend/.next
yarn dev
```

---

## 🎬 Demo Script (After All 3 Tasks Complete)

```
[0:00-0:30] "User Signs Up" 
  - Go to /signup
  - Try invalid email → show error message ✅
  - Fill correctly & signup → success ✅

[0:30-1:00] "Citizen Makes Request"
  - Login as citizen
  - Go to /citizen/request
  - Submit form with validation ✅
  - Show notification bell ✅

[1:00-1:30] "Team Receives Request"
  - Login as rescue team
  - Go to /team/map
  - See rescue request as pin ✅
  - Click to see details ✅
  - Accept request ✅

[1:30-2:00] "Citizen Gets Route"
  - Login as citizen
  - Go to /citizen/map
  - See flooding zones ✅
  - Get GPS location ✅
  - Calculate evacuation route ✅
  - See ETA to shelter ✅

[2:00-2:30] "Real-time Update"
  - Open 2 windows side-by-side
  - Create new request in one → appears on map in other ✅
  - Update status → see real-time updates ✅
```

---

## 🎯 Next Step

**Start NOW:**
1. Read `TASKS_5_6_7_DETAILED_PLAN.md` (30 min)
2. Follow `TASK5_FORM_VALIDATION_STEP_BY_STEP.md`
3. Install Zod: `npm install zod`
4. Create validation schemas
5. Update signup form
6. Test

**Expected finish time**: Today around 6-8 PM ✅

---

**Let's build something great! 🚀**

Generated: 2026-04-24  
Tasks: #5, #6, #7 In Progress  
Status: Ready to implement

