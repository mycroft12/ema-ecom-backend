#!/bin/sh
set -e

# Start backend in background, then wait for it to be ready before Nginx.
java $JAVA_OPTS -jar /app/app.jar &

ready=0
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8080/actuator/health >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "Backend did not become ready on http://127.0.0.1:8080/actuator/health"
  exit 1
fi

exec nginx -g "daemon off;"
