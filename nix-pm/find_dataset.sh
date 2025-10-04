#!/bin/bash

TOKEN=$(curl -s -X POST "http://localhost:8088/api/v1/security/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","provider":"db","refresh":true}' | jq -r '.access_token')

echo "=== Searching for kpi_state_day ==="
curl -s -X GET "http://localhost:8088/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" | jq '.result[] | select(.table_name == "kpi_state_day")'
