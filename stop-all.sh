#!/bin/bash
# Stops every service started by start-all.sh (by port).
echo "Stopping all Stock Trading Pro services..."
for p in 5001 8082 8081 8084 8090 3002; do
  if lsof -ti :"$p" >/dev/null 2>&1; then
    lsof -ti :"$p" | xargs kill -9 2>/dev/null
    echo "  stopped :$p"
  else
    echo "  :$p already stopped"
  fi
done
echo "Done."
