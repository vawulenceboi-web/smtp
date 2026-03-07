#!/bin/bash
# Test script to diagnose Railway backend issues

BACKEND_URL="https://smtp-production-2752.up.railway.app"

echo "🔧 Testing Railway Backend Endpoints"
echo "======================================"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Health endpoint
echo "1️⃣  Testing /health endpoint (GET)"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/health" | head -20
echo ""

# Test 2: Debug endpoint
echo "2️⃣  Testing /api/relays/debug endpoint (GET)"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/api/relays/debug" | head -20
echo ""

# Test 3: List relays
echo "3️⃣  Testing /api/relays endpoint (GET)"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/api/relays" | head -20
echo ""

# Test 4: Test connection endpoint (POST)
echo "4️⃣  Testing /api/relays/test-connection endpoint (POST)"
curl -s -X POST "$BACKEND_URL/api/relays/test-connection" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "test@example.com",
    "password": "test123",
    "use_tls": true
  }' -w "\nStatus: %{http_code}\n" | head -30
echo ""

# Test 5: Check for 404 root
echo "5️⃣  Testing root / endpoint"
curl -s -w "\nStatus: %{http_code}\n" "$BACKEND_URL/" | head -20
echo ""

echo "======================================"
echo "✅ Diagnostic tests complete"
