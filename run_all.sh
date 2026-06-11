#!/bin/bash

# ============================================
# AegisFlowAI — Local Development Startup
# ============================================
# Chạy tất cả services trong terminal hiện tại
# Usage: ./run_all.sh hoặc ./run_all.sh [service]
#   ./run_all.sh          → chạy tất cả
#   ./run_all.sh backend  → chỉ chạy backend
#   ./run_all.sh frontend → chỉ chạy frontend
#   ./run_all.sh reverb   → chỉ chạy WebSocket
#   ./run_all.sh queue    → chỉ chạy queue worker
#   ./run_all.sh schedule → chỉ chạy scheduler
#   ./run_all.sh ai       → chỉ chạy AI service
# ============================================

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PHP_BIN="/opt/homebrew/bin/php"
LOG_DIR="$ROOT_DIR/.dev-logs"
PIDS=()

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$LOG_DIR"

cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo -e "${YELLOW}Stopping services...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
    fi
  done
  wait 2>/dev/null
  echo -e "${GREEN}Done.${NC}"
}

trap cleanup INT TERM EXIT

run_service() {
  local name="$1"
  local dir="$2"
  local log_file="$3"
  shift 3

  (
    cd "$dir" || exit 1
    exec "$@"
  ) > "$LOG_DIR/$log_file" 2>&1 &

  local pid=$!
  PIDS+=("$pid")
  echo "  ${name}: PID $pid | log: $LOG_DIR/$log_file"
}

start_backend() {
  echo -e "${GREEN}🐘 Starting Laravel Backend (port 8000)...${NC}"
  run_service "Backend" "$ROOT_DIR/backend" "backend.log" "$PHP_BIN" artisan serve --port=8000
}

start_frontend() {
  echo -e "${BLUE}⚛️ Starting Next.js Frontend (port 3000)...${NC}"
  run_service "Frontend" "$ROOT_DIR/frontend" "frontend.log" yarn dev
}

start_reverb() {
  echo -e "${YELLOW}🔌 Starting Laravel Reverb WebSocket (port 8080)...${NC}"
  run_service "Reverb" "$ROOT_DIR/backend" "reverb.log" "$PHP_BIN" artisan reverb:start --port=8080
}

start_queue() {
  echo -e "${YELLOW}⚙️  Starting Laravel Queue Worker...${NC}"
  run_service "Queue" "$ROOT_DIR/backend" "queue.log" "$PHP_BIN" artisan queue:work --tries=3 --sleep=1
}

start_scheduler() {
  echo -e "${YELLOW}⏱️  Starting Laravel Scheduler...${NC}"
  run_service "Scheduler" "$ROOT_DIR/backend" "scheduler.log" "$PHP_BIN" artisan schedule:work
}

start_ai() {
  echo -e "${BLUE}🤖 Starting AI Service (port 5005)...${NC}"
  run_service "AI" "$ROOT_DIR/ai-service" "ai.log" ./venv/bin/python main.py
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
  start_queue
  sleep 1
  start_scheduler
  sleep 1
  start_ai

  echo ""
  echo -e "${GREEN}✅ All services started!${NC}"
  echo ""
  echo "  🐘 Backend:   http://localhost:8000"
  echo "  ⚛️ Frontend:  http://localhost:3000"
  echo "  🔌 Reverb WS: ws://localhost:8080"
  echo "  ⚙️ Queue:     worker running"
  echo "  ⏱️ Scheduler: schedule:work running"
  echo "  🤖 AI Engine: http://localhost:5005"
  echo ""
  echo "Logs:"
  echo "  tail -f .dev-logs/frontend.log"
  echo "  tail -f .dev-logs/backend.log"
  echo "  tail -f .dev-logs/queue.log"
  echo "  tail -f .dev-logs/scheduler.log"
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
  wait
else
  case "$1" in
    backend)  start_backend ;;
    frontend) start_frontend ;;
    reverb)   start_reverb ;;
    queue)    start_queue ;;
    schedule) start_scheduler ;;
    ai)       start_ai ;;
    *)
      echo "Usage: ./run_all.sh [backend|frontend|reverb|queue|schedule|ai]"
      echo "  Không có tham số = chạy tất cả"
      ;;
  esac

  if [ "${#PIDS[@]}" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop service.${NC}"
    wait
  fi
fi
