#!/bin/bash
# Stops every service started by start-all.sh (by port).
echo "Stopping all Stock Trading Pro services..."

# -sTCP:LISTEN is essential: a bare `lsof -ti :PORT` also matches processes that merely
# hold a CLIENT connection to that port. Market-Data keeps an outbound connection to the
# Python service on 5001, so without this filter, stopping :5001 also killed Market-Data —
# which then reported ":8081 already stopped" on the next iteration.
for p in 5001 8082 8081 8084 8090 3002; do
  pids=$(lsof -ti :"$p" -sTCP:LISTEN 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null
    echo "  stopped :$p"
  else
    echo "  :$p already stopped"
  fi
done
echo "Done."
