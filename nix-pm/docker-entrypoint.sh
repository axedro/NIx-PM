#!/bin/sh
set -e

# Generate runtime config.js from environment variables
cat > /usr/share/nginx/html/config.js <<EOF
// Runtime configuration - injected from environment variables
window.APP_CONFIG = {
  SUPERSET_URL: '${SUPERSET_URL:-http://localhost:8088}',
  SUPERSET_IFRAME_URL: '${SUPERSET_IFRAME_URL:-${SUPERSET_URL:-http://localhost:8088}}',
  API_URL: '${API_URL:-http://localhost:3001}'
};
EOF

echo "Runtime configuration generated:"
cat /usr/share/nginx/html/config.js

# Execute the CMD
exec "$@"
