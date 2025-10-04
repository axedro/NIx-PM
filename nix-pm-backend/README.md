# NIx PM Backend - Alert Service

Backend service for KPI alerts and analytics in NIx PM.

## Features

- **Threshold Alerts**: Simple rule-based alerts with configurable upper/lower thresholds
- **KPI Statistics**: Calculate min, max, avg, median, stddev for any KPI
- **Alert Scheduler**: Automatic periodic checking of alert conditions
- **PostgreSQL Integration**: Direct connection to Azure PostgreSQL database
- **RESTful API**: Complete CRUD operations for alerts and triggers

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

The database is already configured for:
- **Host**: tfspain-postgres.postgres.database.azure.com
- **Port**: 5432
- **Database**: pm_db
- **Table**: kpi_global_15min

### 3. Run Database Migrations

```bash
npm run migrate
```

This creates three tables:
- `alerts` - Alert configurations
- `alert_triggers` - Alert trigger history
- `alert_statistics` - Cached KPI statistics

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## API Endpoints

### Alerts

```
GET    /api/alerts              - List all alerts
GET    /api/alerts/:id          - Get alert by ID
POST   /api/alerts              - Create new alert
PUT    /api/alerts/:id          - Update alert
DELETE /api/alerts/:id          - Delete alert
PUT    /api/alerts/:id/enable   - Enable alert
PUT    /api/alerts/:id/disable  - Disable alert
POST   /api/alerts/:id/test     - Test alert (dry run)
GET    /api/alerts/:id/statistics - Get KPI statistics
```

### Triggers

```
GET    /api/triggers                  - Get all recent triggers
GET    /api/triggers/alert/:alertId  - Get triggers for specific alert
PUT    /api/triggers/:id/resolve     - Mark trigger as resolved
```

### Statistics

```
POST   /api/statistics/calculate  - Calculate KPI statistics
```

## Creating a Threshold Alert

### Example Request

```bash
POST http://localhost:3001/api/alerts
Content-Type: application/json

{
  "name": "High PDCP Traffic Alert",
  "description": "Alert when PDCP traffic exceeds threshold",
  "kpi_name": "dl_pdcp_sdu_traffic_all_qci",
  "dataset_name": "kpi_global_15min",
  "alert_type": "threshold",
  "enabled": true,
  "config": {
    "metric": "dl_pdcp_sdu_traffic_all_qci",
    "threshold_upper": 10000,
    "comparison": "greater_than",
    "time_window": "1hour",
    "aggregation": "avg"
  }
}
```

### Configuration Options

**Time Windows**:
- `15min` - Last 15 minutes
- `1hour` - Last 1 hour
- `1day` - Last 24 hours
- `1week` - Last 7 days

**Aggregation Methods**:
- `avg` - Average value
- `sum` - Sum of values
- `max` - Maximum value
- `min` - Minimum value

**Comparison Types**:
- `greater_than` - Alert when value > threshold_upper
- `less_than` - Alert when value < threshold_lower
- `between` - Alert when value outside range [threshold_lower, threshold_upper]

## Alert Scheduler

The scheduler runs every 5 minutes by default (configurable in `.env`).

For each enabled alert:
1. Query KPI data from PostgreSQL
2. Apply aggregation function over time window
3. Compare against threshold(s)
4. Create trigger record if condition met
5. Log results to console

## Testing

### Test Database Connection

```bash
curl http://localhost:3001/health
```

### Calculate KPI Statistics

```bash
POST http://localhost:3001/api/statistics/calculate
Content-Type: application/json

{
  "kpi_name": "dl_pdcp_sdu_traffic_all_qci",
  "dataset_name": "kpi_global_15min",
  "time_window": "1day"
}
```

### Test Alert (Dry Run)

```bash
POST http://localhost:3001/api/alerts/1/test
```

## Project Structure

```
src/
├── config/
│   └── database.ts           # PostgreSQL connection
├── types/
│   └── alerts.ts             # TypeScript types & schemas
├── services/
│   ├── alertService.ts       # Alert CRUD operations
│   ├── statisticsService.ts  # KPI statistics calculations
│   ├── thresholdService.ts   # Threshold alert evaluation
│   └── schedulerService.ts   # Alert scheduler
├── routes/
│   ├── alerts.ts             # Alert API endpoints
│   ├── triggers.ts           # Trigger API endpoints
│   └── statistics.ts         # Statistics API endpoints
├── scripts/
│   └── migrate.ts            # Database migrations
└── index.ts                  # Express server entry point
```

## Development

### Watch Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run Production Build

```bash
npm start
```

## Troubleshooting

### Database Connection Issues

If you see SSL errors, ensure `DB_SSL=true` is set in `.env`.

### Column Not Found

Make sure the KPI column name is spelled exactly as in the database (case-sensitive).

Example: `dl_pdcp_sdu_traffic_all_qci`

### No Data Returned

Check that:
1. Data exists in `kpi_global_15min` table
2. Time window includes recent data
3. KPI column is not NULL

## Next Steps

- [ ] Implement anomaly detection alerts
- [ ] Add email/Slack notifications
- [ ] Build frontend UI for alert management
- [ ] Add user authentication
- [ ] Implement alert templates
- [ ] Add more aggregation functions
- [ ] Support custom SQL queries
