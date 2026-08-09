#!/bin/bash
# Starts the whole stack (Python, Auth, Core, Gateway, Frontend) in the background.
# Usage:  ./start-all.sh        Logs:  ./logs/<service>.log     Stop:  ./stop-all.sh
set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

# Load secrets from .env (gitignored). No hardcoded fallbacks live in the
# services anymore, so these must be provided here or the services won't start.
if [ -f "$ROOT/.env" ]; then
  set -a; . "$ROOT/.env"; set +a
else
  printf "\033[31m✗ Missing %s — run ./setup.sh first (it creates .env and installs dependencies).\033[0m\n" "$ROOT/.env"
  exit 1
fi

missing=""
placeholder=""
for v in DB_PASSWORD JWT_SECRET INTERNAL_API_KEY; do
  eval "val=\${$v:-}"
  if [ -z "$val" ]; then
    missing="$missing $v"
  elif printf '%s' "$val" | grep -q "change_me\|your_"; then
    placeholder="$placeholder $v"
  fi
done
if [ -n "$missing" ]; then
  printf "\033[31m✗ Required secret(s) unset in .env:%s\033[0m\n" "$missing"
  exit 1
fi
if [ -n "$placeholder" ]; then
  printf "\033[31m✗ Secret(s) still set to the .env.example placeholder:%s — set real values.\033[0m\n" "$placeholder"
  exit 1
fi

# Pin JDK 21 for all Spring services. Locations differ by platform (Apple Silicon vs
# Intel Homebrew vs Linux), so probe rather than hardcode one path.
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q '"21'; then
  for candidate in /opt/homebrew/opt/openjdk@21 /usr/local/opt/openjdk@21 /usr/lib/jvm/java-21-openjdk; do
    [ -x "$candidate/bin/java" ] && { export JAVA_HOME="$candidate"; break; }
  done
fi
if [ -z "${JAVA_HOME:-}" ] && command -v /usr/libexec/java_home >/dev/null 2>&1; then
  JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null)" && export JAVA_HOME
fi
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  printf "\033[31m✗ Java 21 not found. Install it (brew install openjdk@21) or set JAVA_HOME.\033[0m\n"
  exit 1
fi
export PATH="$JAVA_HOME/bin:$PATH"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

# Wait until something is listening on a port (max ~90s)
# -sTCP:LISTEN throughout: a bare `lsof -ti :PORT` also matches processes holding a
# CLIENT connection to that port, which would make wait_port report a service "up"
# because something merely connected to it, and make free_port kill unrelated services
# (Market-Data holds an outbound connection to Python on 5001).
wait_port() {
  local port=$1 name=$2
  for i in $(seq 1 45); do
    if lsof -ti :"$port" -sTCP:LISTEN >/dev/null 2>&1; then green "  ✓ $name is up on :$port"; return 0; fi
    sleep 2
  done
  red "  ✗ $name did NOT come up on :$port — check $LOGS"
  return 1
}

free_port() { lsof -ti :"$1" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null; }

echo "== Stock Trading Pro — starting all services =="

# Dependencies that setup.sh installs. Checked here so a fresh clone gets a clear
# instruction instead of "no such file" from nohup or a blank frontend log.
if [ ! -x "$ROOT/python/venv/bin/python" ]; then
  red "✗ Python virtualenv missing — run ./setup.sh first."
  exit 1
fi
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  red "✗ Frontend dependencies missing — run ./setup.sh first."
  exit 1
fi

# 0) MySQL sanity check
# A real query, not `mysqladmin ping` — ping exits 0 even on a wrong password, so it
# cannot tell "server up" from "credentials valid". MYSQL_PWD keeps it off the ps list.
if ! MYSQL_PWD="${DB_PASSWORD}" mysql -u"${DB_USERNAME:-root}" -e "SELECT 1" >/dev/null 2>&1; then
  yellow "⚠ MySQL rejected DB_USERNAME/DB_PASSWORD from .env, or is not running — services will fail to start."
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
