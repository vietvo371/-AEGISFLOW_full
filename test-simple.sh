#!/bin/bash

# Simple test - create 2 alerts to test popup and notification bell
API_URL="http://localhost:8000/api"

echo "🔔 Simple Realtime Alert Test"
echo "============================="
echo ""

# Login
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aegisflow.ai","password":"password"}')

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in"
echo ""

# Alert 1 - High severity
echo "📤 Creating Alert 1 (HIGH severity)..."
curl -s -X POST "$API_URL/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Flood Warning - Quận 1",
    "description": "High water level detected",
    "alert_type": "flood_warning",
    "severity": "high",
    "status": "active",
    "affected_districts": ["Quận 1"]
  }' > /dev/null

echo "✅ Alert 1 created"
echo ""
sleep 2

# Alert 2 - Critical severity
echo "📤 Creating Alert 2 (CRITICAL severity)..."
curl -s -X POST "$API_URL/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Critical Flood - Quận 5",
    "description": "Water level critical - evacuate immediately",
    "alert_type": "flood_warning",
    "severity": "critical",
    "status": "active",
    "affected_districts": ["Quận 5"]
  }' > /dev/null

echo "✅ Alert 2 created"
echo ""
echo "🔍 Check:"
echo "  - Bell icon should animate 2 times"
echo "  - 2 toast notifications should appear (top-right)"
echo "  - Dropdown should show 2 notifications (not auto-open)"
echo "  - Click notification to test navigation"
echo ""
