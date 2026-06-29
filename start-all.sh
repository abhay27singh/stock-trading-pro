#!/bin/bash
# Starts the whole stack (Python, Auth, Core, Gateway, Frontend) in the background.
# Usage:  ./start-all.sh        Logs:  ./logs/<service>.log     Stop:  ./stop-all.sh
set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

# Pin JDK 21 for all Spring services
export JAVA_HOME="/usr/local/opt/openjdk@21"
export PATH="$JAVA_HOME/bin:$PATH"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

# Wait until something is listening on a port (max ~90s)
wait_port() {
  local port=$1 name=$2
  for i in $(seq 1 45); do
    if lsof -ti :"$port" >/dev/null 2>&1; then green "  ✓ $name is up on :$port"; return 0; fi
    sleep 2
  done
  red "  ✗ $name did NOT come up on :$port — check $LOGS"
  return 1
}

free_port() { lsof -ti :"$1" | xargs kill -9 2>/dev/null; }

echo "== Stock Trading Pro — starting all services =="

# 0) MySQL sanity check
if ! mysqladmin ping -uroot -p***REDACTED*** --silent 2>/dev/null; then
  yellow "⚠ MySQL not reachable on root/***REDACTED*** — make sure MySQL is running first."
fi

# Free any stale processes on our ports
for p in 5001 8082 8081 8084 8090 3002; do free_port "$p"; done
sleep 1

# 1) Python market-data / prediction service (5001)
yellow "→ Python service (5001)"
( cd "$ROOT/python" && nohup ./venv/bin/python prediction_service.py > "$LOGS/python.log" 2>&1 & )
wait_port 5001 "Python"

# 2) Auth/User service (8082)
yellow "→ Auth service (8082)"
( cd "$ROOT/services/auth-user-service" && nohup ./mvnw spring-boot:run > "$LOGS/auth.log" 2>&1 & )
wait_port 8082 "Auth service"

# 3) Market-Data service (8081) — lives in backend/
yellow "→ Market-Data service (8081)"
( cd "$ROOT/backend" && nohup ./mvnw spring-boot:run > "$LOGS/market-data.log" 2>&1 & )
wait_port 8081 "Market-Data service"

# 4) Trading service (8084)
yellow "→ Trading service (8084)"
( cd "$ROOT/services/trading-service" && nohup ./mvnw spring-boot:run > "$LOGS/trading.log" 2>&1 & )
wait_port 8084 "Trading service"

# 5) API Gateway (8090)
yellow "→ API Gateway (8090)"
( cd "$ROOT/services/gateway" && nohup ./mvnw spring-boot:run > "$LOGS/gateway.log" 2>&1 & )
wait_port 8090 "Gateway"

# 6) Frontend (3002)
yellow "→ Frontend (3002)"
( cd "$ROOT/frontend" && nohup npm start > "$LOGS/frontend.log" 2>&1 & )
wait_port 3002 "Frontend"

echo
green "== All services launched =="
echo "  Frontend : http://localhost:3002"
echo "  Gateway  : http://localhost:8090"
echo "  Logs     : $LOGS  (tail -f logs/core.log etc.)"
echo "  Stop all : ./stop-all.sh"
