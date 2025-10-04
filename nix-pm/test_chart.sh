#!/bin/bash

SUPERSET_URL="http://localhost:8088"

# Login
TOKEN=$(curl -s -X POST "$SUPERSET_URL/api/v1/security/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","provider":"db","refresh":true}' | \
  jq -r '.access_token')

echo "Token: ${TOKEN:0:20}..."

# Get datasets
echo -e "\nDatasets:"
curl -s -X GET "$SUPERSET_URL/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.result[] | "\(.id): \(.table_name)"'

# Get dataset ID for kpi_state_day
DATASET_ID=$(curl -s -X GET "$SUPERSET_URL/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.result[] | select(.table_name=="kpi_state_day") | .id')

echo -e "\nDataset ID for kpi_state_day: $DATASET_ID"

# Get dataset details
echo -e "\nDataset columns:"
curl -s -X GET "$SUPERSET_URL/api/v1/dataset/$DATASET_ID" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.result.columns[] | "\(.column_name) (is_dttm: \(.is_dttm))"'

# Get time column
TIME_COL=$(curl -s -X GET "$SUPERSET_URL/api/v1/dataset/$DATASET_ID" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.result.columns[] | select(.is_dttm==true) | .column_name' | head -1)

echo -e "\nTime column: $TIME_COL"

# Create chart
CHART_PARAMS=$(cat <<JSON
{
  "datasource": "${DATASET_ID}__table",
  "viz_type": "line",
  "granularity_sqla": "$TIME_COL",
  "time_range": "No filter",
  "metrics": ["rssi"],
  "groupby": [],
  "row_limit": 10000
}
JSON
)

echo -e "\nCreating chart..."
RESPONSE=$(curl -s -X POST "$SUPERSET_URL/api/v1/chart/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"slice_name\": \"Test Line Chart - RSSI\",
    \"viz_type\": \"line\",
    \"datasource_id\": $DATASET_ID,
    \"datasource_type\": \"table\",
    \"params\": $(echo "$CHART_PARAMS" | jq -c .)
  }")

echo "$RESPONSE" | jq .

CHART_ID=$(echo "$RESPONSE" | jq -r '.id // empty')
if [ ! -z "$CHART_ID" ]; then
  echo -e "\n✅ Chart created! ID: $CHART_ID"
  echo "View at: $SUPERSET_URL/explore/?slice_id=$CHART_ID"
fi
