#!/bin/bash

# ============================================
# AegisFlowAI — Local Development Startup
# ============================================
# Chạy tất cả services trong các cửa sổ Terminal riêng biệt
# Usage: ./run_all.sh hoặc ./run_all.sh [service]
#   ./run_all.sh          → chạy tất cả
#   ./run_all.sh backend  → chỉ chạy backend
#   ./run_all.sh frontend → chỉ chạy frontend
#   ./run_all.sh reverb   → chỉ chạy WebSocket
#   ./run_all.sh ai       → chỉ chạy AI service
# ============================================

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
ROOT_DIR="/Volumes/MAC_OPTION/DATN/ AEGISFLOWAI"
PHP_BIN="/opt/homebrew/bin/php"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

start_backend() {
  echo -e "${GREEN}🐘 Starting Laravel Backend (port 8000)...${NC}"
  osascript -e "
    tell application \"Terminal\"
      do script \"cd '$ROOT_DIR/backend' && $PHP_BIN artisan serve --port=8000\"
      set custom title of front window to \"🐘 Backend :8000\"
    end tell
  "
}

start_frontend() {
  echo -e "${BLUE}⚛️ Starting Next.js Frontend (port 3000)...${NC}"
  osascript -e "
    tell application \"Terminal\"
      do script \"cd '$ROOT_DIR/frontend' && yarn dev\"
      set custom title of front window to \"⚛️ Frontend :3000\"
    end tell
  "
}

start_reverb() {
  echo -e "${YELLOW}🔌 Starting Laravel Reverb WebSocket (port 8080)...${NC}"
  osascript -e "
    tell application \"Terminal\"
      do script \"cd '$ROOT_DIR/backend' && $PHP_BIN artisan reverb:start\"
      set custom title of front window to \"🔌 Reverb :8080\"
    end tell
  "
}

start_ai() {
  echo -e "${BLUE}🤖 Starting AI Service (port 5005)...${NC}"
  osascript -e "
    tell application \"Terminal\"
      do script \"cd '$ROOT_DIR/ai-service' && ./venv/bin/python main.py\"
      set custom title of front window to \"🤖 AI :5005\"
    end tell
  "
}

# ============================================
# Main
# ============================================

if [ -z "$1" ]; then
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   AegisFlowAI — Dev Environment      ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""

  start_backend
  sleep 1
  start_frontend
  sleep 1
  start_reverb
  sleep 1
  start_ai

  echo ""
  echo -e "${GREEN}✅ All services started!${NC}"
  echo ""
  echo "  🐘 Backend:   http://localhost:8000"
  echo "  ⚛️ Frontend:  http://localhost:3000"
  echo "  🔌 Reverb WS: ws://localhost:8080"
  echo "  🤖 AI Engine: http://localhost:5005"
  echo ""
else
  case "$1" in
    backend)  start_backend ;;
    frontend) start_frontend ;;
    reverb)   start_reverb ;;
    ai)       start_ai ;;
    *)
      echo "Usage: ./run_all.sh [backend|frontend|reverb|ai]"
      echo "  Không có tham số = chạy tất cả"
      ;;
  esac
fi
