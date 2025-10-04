#!/bin/bash

# Login to Superset
TOKEN=$(curl -s -X POST "http://localhost:8088/api/v1/security/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","provider":"db","refresh":true}' | jq -r '.access_token')

echo "Token obtained: ${TOKEN:0:20}..."
echo ""

# Get datasets list
echo "=== DATASETS LIST ==="
curl -s -X GET "http://localhost:8088/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" | jq '.result[] | {id: .id, table_name: .table_name, database: .database.database_name}'

echo ""
echo "=== TOTAL DATASETS ==="
curl -s -X GET "http://localhost:8088/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" | jq '.count'

# Get first dataset details if any
FIRST_DATASET_ID=$(curl -s -X GET "http://localhost:8088/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.result[0].id // empty')

if [ ! -z "$FIRST_DATASET_ID" ]; then
  echo ""
  echo "=== FIRST DATASET DETAILS (ID: $FIRST_DATASET_ID) ==="
  curl -s -X GET "http://localhost:8088/api/v1/dataset/$FIRST_DATASET_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.result | {id, table_name, columns: .columns[] | {column_name, type, is_dttm}}'
fi
