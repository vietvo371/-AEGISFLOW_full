#!/bin/bash

# ============================================
# AegisFlowAI — Realtime Test Flow
# ============================================
# Test tất cả realtime events
# Usage: ./test_realtime_flow.sh
# ============================================

API_URL="http://localhost:8000/api"
TOKEN=""

echo "=============================================="
echo "  AegisFlowAI — Realtime Test Flow"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Login to get token
echo -e "${BLUE}[1/6]${NC} Đăng nhập để lấy token..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "admin@aegisflow.ai",
    "password": "password"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed! Check credentials or backend.${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful!${NC}"
echo ""

# Step 2: Create Incident (should trigger .IncidentCreated)
echo -e "${BLUE}[2/6]${NC} Tạo Incident mới (test .IncidentCreated)..."
echo ""

INCIDENT_RESPONSE=$(curl -s -X POST "$API_URL/incidents" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Incident - Realtime Flow",
    "type": "flood",
    "severity": "high",
    "status": "active",
    "address": "123 Test Street, District 1",
    "description": "This is a test incident for realtime flow",
    "latitude": 16.0544,
    "longitude": 108.2022
  }')

INCIDENT_ID=$(echo $INCIDENT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$INCIDENT_ID" ]; then
  echo -e "${RED}❌ Create incident failed!${NC}"
  echo "Response: $INCIDENT_RESPONSE"
else
  echo -e "${GREEN}✅ Incident created! ID: $INCIDENT_ID${NC}"
fi
echo ""

# Step 3: Create Alert (should trigger .AlertCreated)
echo -e "${BLUE}[3/6]${NC} Tạo Alert mới (test .AlertCreated)..."
echo ""

ALERT_RESPONSE=$(curl -s -X POST "$API_URL/alerts" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Alert - Realtime Flow",
    "description": "This is a test alert for realtime flow",
    "alert_type": "flood_warning",
    "severity": "high",
    "status": "active"
  }')

ALERT_ID=$(echo $ALERT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$ALERT_ID" ]; then
  echo -e "${RED}❌ Create alert failed!${NC}"
  echo "Response: $ALERT_RESPONSE"
else
  echo -e "${GREEN}✅ Alert created! ID: $ALERT_ID${NC}"
fi
echo ""

# Step 4: Create Rescue Request (should trigger .RescueRequestCreated)
echo -e "${BLUE}[4/6]${NC} Tạo Rescue Request (test .RescueRequestCreated)..."
echo ""

RESCUE_RESPONSE=$(curl -s -X POST "$API_URL/rescue-requests" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "caller_name": "Nguyen Van Test",
    "caller_phone": "0912345678",
    "latitude": 16.0544,
    "longitude": 108.2022,
    "address": "456 Rescue Street, District 2, Da Nang",
    "urgency": "high",
    "category": "rescue",
    "people_count": 5,
    "description": "Test rescue request for realtime flow"
  }')

RESCUE_ID=$(echo $RESCUE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$RESCUE_ID" ]; then
  echo -e "${RED}❌ Create rescue request failed!${NC}"
  echo "Response: $RESCUE_RESPONSE"
else
  echo -e "${GREEN}✅ Rescue Request created! ID: $RESCUE_ID${NC}"
fi
echo ""

# Step 5: Update Rescue Request (should trigger .RescueRequestUpdated)
echo -e "${BLUE}[5/6]${NC} Cập nhật Rescue Request (test .RescueRequestUpdated)..."
echo ""

if [ -n "$RESCUE_ID" ]; then
  UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/rescue-requests/$RESCUE_ID" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "status": "assigned"
    }')

  echo -e "${GREEN}✅ Rescue Request updated!${NC}"
else
  echo -e "${YELLOW}⚠️ Skipping update (no rescue ID)${NC}"
fi
echo ""

# Step 6: Resolve Incident (should trigger .IncidentResolved)
echo -e "${BLUE}[6/6]${NC} Giải quyết Incident (test .IncidentResolved)..."
echo ""

if [ -n "$INCIDENT_ID" ]; then
  RESOLVE_RESPONSE=$(curl -s -X PATCH "$API_URL/incidents/$INCIDENT_ID" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "status": "resolved"
    }')

  echo -e "${GREEN}✅ Incident resolved!${NC}"
else
  echo -e "${YELLOW}⚠️ Skipping resolve (no incident ID)${NC}"
fi
echo ""

# Summary
echo "=============================================="
echo "  Test Summary"
echo "=============================================="
echo ""
echo -e "Incident ID:     ${GREEN}$INCIDENT_ID${NC}"
echo -e "Alert ID:        ${GREEN}$ALERT_ID${NC}"
echo -e "Rescue Request:  ${GREEN}$RESCUE_ID${NC}"
echo ""
echo "Check your frontend browser console for realtime events:"
echo "  🔔 .IncidentCreated"
echo "  🔔 .AlertCreated"
echo "  🔔 .RescueRequestCreated"
echo "  🔔 .RescueRequestUpdated"
echo "  ✅ .IncidentResolved"
echo ""
echo -e "${GREEN}==============================================${NC}"
echo "  Realtime Test Flow Complete!"
echo "=============================================="
