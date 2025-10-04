#!/bin/bash

TOKEN=$(curl -s -X POST "http://localhost:8088/api/v1/security/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","provider":"db","refresh":true}' | jq -r '.access_token')

echo "=== Testing dataset IDs ==="
for ID in 1 2 3 4 5 6 7 8 9 10; do
  RESULT=$(curl -s -X GET "http://localhost:8088/api/v1/dataset/$ID" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  
  TABLE_NAME=$(echo "$RESULT" | jq -r '.result.table_name // empty' 2>/dev/null)
  
  if [ ! -z "$TABLE_NAME" ]; then
    echo "ID $ID: $TABLE_NAME"
    if [ "$TABLE_NAME" = "kpi_state_day" ]; then
      echo "  ✅ Found kpi_state_day!"
      echo "$RESULT" | jq -r '.result | {id, table_name, columns: [.columns[] | {name: .column_name, is_dttm}]}'
      break
    fi
  fi
done
