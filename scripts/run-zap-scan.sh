#!/bin/bash

echo "🚀 Starting OWASP ZAP..."

# Start ZAP in daemon mode
/opt/ZAP_2.14.0/zap.sh -daemon -host 0.0.0.0 -port 8090 -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true &

# Wait for ZAP to start
echo "⏳ Waiting for ZAP to initialize..."
sleep 30

echo "✅ ZAP is ready"
