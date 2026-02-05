#!/bin/bash
# Robust cleanup script for Hebelki dev server

echo "🧹 Cleaning up Hebelki dev server..."

# 1. Stop PM2 process first (cleanest way)
echo "  → Stopping PM2 process..."
pm2 delete hebelki 2>/dev/null || true

# 2. Kill by port using lsof
echo "  → Killing processes on port 3005..."
lsof -ti :3005 | xargs -r kill -9 2>/dev/null

# 3. Kill next-server processes specifically
echo "  → Killing next-server processes..."
pkill -9 -f "next-server.*3005" 2>/dev/null

# 4. Kill all node processes in this directory
echo "  → Killing node processes in Hebelki directory..."
pkill -9 -f "06-HEBELKI/app.*next dev" 2>/dev/null

# 5. Kill any Next.js dev processes
echo "  → Killing Next.js dev processes..."
pkill -9 -f "next dev.*3005" 2>/dev/null

# 6. Kill turbopack processes
echo "  → Killing Turbopack processes..."
pkill -9 -f "turbopack.*3005" 2>/dev/null

# 7. Use netstat to find PID listening on port 3005 and kill it
echo "  → Finding and killing port listener..."
PORT_PID=$(netstat -tulpn 2>/dev/null | grep :3005 | awk '{print $7}' | cut -d'/' -f1)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
fi

# Wait a moment
sleep 1

# Verify port is free
if lsof -i :3005 >/dev/null 2>&1; then
  echo "  ⚠️  Port 3005 still in use, forcing final cleanup..."
  lsof -ti :3005 | xargs -r kill -9 2>/dev/null
  sleep 2
fi

# Final check
if lsof -i :3005 >/dev/null 2>&1; then
  echo "  ❌ Failed to free port 3005"
  exit 1
else
  echo "  ✅ Port 3005 is now free"
fi

echo "✅ Cleanup complete!"
