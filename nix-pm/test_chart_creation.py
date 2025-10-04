import requests
import json

# Superset credentials
SUPERSET_URL = "http://localhost:8088"
USERNAME = "admin"
PASSWORD = "admin"

# Login and get access token
login_response = requests.post(
    f"{SUPERSET_URL}/api/v1/security/login",
    json={
        "username": USERNAME,
        "password": PASSWORD,
        "provider": "db",
        "refresh": True
    }
)
access_token = login_response.json()["access_token"]
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Get datasets
datasets_response = requests.get(
    f"{SUPERSET_URL}/api/v1/dataset/",
    headers=headers
)
print("Datasets available:")
datasets = datasets_response.json()["result"]
for ds in datasets:
    print(f"  - {ds['table_name']} (id: {ds['id']})")

# Find kpi_state_day dataset
kpi_dataset = next((ds for ds in datasets if ds['table_name'] == 'kpi_state_day'), None)

if not kpi_dataset:
    print("\nDataset 'kpi_state_day' not found!")
    exit(1)

print(f"\nUsing dataset: {kpi_dataset['table_name']} (id: {kpi_dataset['id']})")

# Get dataset columns
dataset_detail = requests.get(
    f"{SUPERSET_URL}/api/v1/dataset/{kpi_dataset['id']}",
    headers=headers
).json()

print("\nDataset columns:")
time_column = None
for col in dataset_detail['result']['columns']:
    print(f"  - {col['column_name']} (type: {col.get('type')}, is_dttm: {col.get('is_dttm')})")
    if col.get('is_dttm') or 'time' in col['column_name'].lower() or 'date' in col['column_name'].lower():
        time_column = col['column_name']

print(f"\nDetected time column: {time_column}")

# Create a test chart with a simple metric
chart_data = {
    "slice_name": "Test Chart - RSSI Line Chart",
    "viz_type": "line",
    "datasource_id": kpi_dataset['id'],
    "datasource_type": "table",
    "params": json.dumps({
        "datasource": f"{kpi_dataset['id']}__table",
        "viz_type": "line",
        "slice_id": None,
        "granularity_sqla": time_column,
        "time_range": "No filter",
        "metrics": ["rssi"],
        "adhoc_filters": [],
        "groupby": [],
        "row_limit": 10000,
        "color_scheme": "supersetColors",
        "show_legend": True,
        "x_axis_label": "Time",
        "y_axis_label": "Value",
        "line_interpolation": "linear"
    })
}

print("\nCreating chart with data:")
print(json.dumps(chart_data, indent=2))

# Create the chart
create_response = requests.post(
    f"{SUPERSET_URL}/api/v1/chart/",
    headers=headers,
    json=chart_data
)

if create_response.status_code == 201:
    chart_id = create_response.json()["id"]
    print(f"\n✅ Chart created successfully! ID: {chart_id}")
    print(f"View it at: {SUPERSET_URL}/explore/?slice_id={chart_id}")
else:
    print(f"\n❌ Failed to create chart: {create_response.status_code}")
    print(create_response.text)
