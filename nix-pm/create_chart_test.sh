#!/bin/bash

SUPERSET_URL="http://localhost:8088"

# Login and get token
echo "=== Logging in ==="
TOKEN=$(curl -s -X POST "$SUPERSET_URL/api/v1/security/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin","provider":"db","refresh":true}' | jq -r '.access_token')

echo "Token: ${TOKEN:0:30}..."

# Get kpi_state_day dataset
echo -e "\n=== Getting kpi_state_day dataset ==="
DATASET=$(curl -s -G "$SUPERSET_URL/api/v1/dataset/" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode 'q={"filters":[{"col":"table_name","opr":"eq","value":"kpi_state_day"}]}' | jq -r '.result[0]')

DATASET_ID=$(echo "$DATASET" | jq -r '.id')
echo "Dataset ID: $DATASET_ID"
echo "Dataset table: $(echo "$DATASET" | jq -r '.table_name')"

# Get dataset details to find time column
echo -e "\n=== Getting dataset columns ==="
DATASET_DETAIL=$(curl -s -X GET "$SUPERSET_URL/api/v1/dataset/$DATASET_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Columns:"
echo "$DATASET_DETAIL" | jq -r '.result.columns[] | "\(.column_name) - is_dttm: \(.is_dttm), type: \(.type)"'

TIME_COLUMN=$(echo "$DATASET_DETAIL" | jq -r '.result.columns[] | select(.is_dttm==true) | .column_name' | head -1)
echo -e "\nTime column: $TIME_COLUMN"

# Create chart with rssi metric
echo -e "\n=== Creating chart ==="

CHART_PARAMS=$(jq -n \
  --arg datasource "${DATASET_ID}__table" \
  --arg viz_type "line" \
  --arg time_col "$TIME_COLUMN" \
  '{
    "datasource": $datasource,
    "viz_type": $viz_type,
    "metrics": ["rssi"],
    "adhoc_filters": [],
    "row_limit": 10000,
    "granularity_sqla": $time_col,
    "time_range": "No filter",
    "x_axis_time_format": "smart_date",
    "line_interpolation": "linear",
    "show_legend": true
  }')

echo "Chart params:"
echo "$CHART_PARAMS" | jq .

CHART_RESPONSE=$(curl -s -X POST "$SUPERSET_URL/api/v1/chart/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg name "Test Line Chart - RSSI (API)" \
    --arg viz "line" \
    --argjson dataset_id "$DATASET_ID" \
    --arg params "$CHART_PARAMS" \
    '{
      "slice_name": $name,
      "viz_type": $viz,
      "datasource_id": $dataset_id,
      "datasource_type": "table",
      "params": $params
    }')")

echo -e "\n=== Chart creation response ==="
echo "$CHART_RESPONSE" | jq .

CHART_ID=$(echo "$CHART_RESPONSE" | jq -r '.id // empty')
if [ ! -z "$CHART_ID" ]; then
  echo -e "\n✅ Chart created successfully!"
  echo "Chart ID: $CHART_ID"
  echo "View at: $SUPERSET_URL/explore/?slice_id=$CHART_ID"
else
  echo -e "\n❌ Failed to create chart"
  echo "Error: $(echo "$CHART_RESPONSE" | jq -r '.message // .error // "Unknown error"')"
fi
