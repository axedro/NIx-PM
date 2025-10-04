# KPI Alerts Feature - Implementation Status

**Branch**: `feature/kpi-alerts`
**Phase**: Backend Complete ✅ | Frontend Pending ⏳

## ✅ Completed: Backend Service

### Database Configuration
- **Connection**: Azure PostgreSQL (`tfspain-postgres.postgres.database.azure.com`)
- **Database**: `pm_db`
- **Table**: `kpi_global_15min`
- **Example KPI**: `dl_pdcp_sdu_traffic_all_qci`
- **SSL**: Enabled with `sslmode=require`

### Database Schema Created
```sql
✓ alerts            - Alert configurations
✓ alert_triggers    - Alert activation history
✓ alert_statistics  - Cached KPI statistics (min, max, avg, median, stddev)
```

### Backend Services Implemented
```
✓ alertService.ts       - CRUD operations for alerts
✓ statisticsService.ts  - KPI statistics calculations
✓ thresholdService.ts   - Threshold alert evaluation logic
✓ schedulerService.ts   - Periodic alert checking (every 5 minutes)
```

### API Endpoints Available
```
✓ GET    /api/alerts                     - List all alerts
✓ GET    /api/alerts/:id                 - Get alert details
✓ POST   /api/alerts                     - Create new alert
✓ PUT    /api/alerts/:id                 - Update alert
✓ DELETE /api/alerts/:id                 - Delete alert
✓ PUT    /api/alerts/:id/enable          - Enable alert
✓ PUT    /api/alerts/:id/disable         - Disable alert
✓ POST   /api/alerts/:id/test            - Test alert (dry run)
✓ GET    /api/alerts/:id/statistics      - Get KPI statistics

✓ GET    /api/triggers                   - Get all recent triggers
✓ GET    /api/triggers/alert/:alertId    - Get triggers for specific alert
✓ PUT    /api/triggers/:id/resolve       - Mark trigger as resolved

✓ POST   /api/statistics/calculate       - Calculate KPI statistics on demand
```

### Features Implemented
- ✅ Threshold-based alerts
  - Configurable upper/lower thresholds
  - Comparison operators: `greater_than`, `less_than`, `between`
  - Aggregation methods: `avg`, `sum`, `max`, `min`
  - Time windows: `15min`, `1hour`, `1day`, `1week`

- ✅ KPI Statistics Calculation
  - Automatically calculates: min, max, avg, median, stddev
  - Cached in database for performance
  - Supports custom time periods

- ✅ Alert Scheduling
  - Runs every 5 minutes (configurable)
  - Evaluates all enabled alerts
  - Creates trigger records when conditions met
  - Detailed logging of all evaluations

- ✅ PostgreSQL Integration
  - Direct database connection
  - Parameterized queries (SQL injection safe)
  - Connection pooling
  - SSL support for Azure

## ⏳ Pending: Frontend Implementation

### Pages to Create
- [ ] `/alerts` - Main alerts listing page
- [ ] `/alerts/create` - Create new alert wizard
- [ ] `/alerts/:id` - Alert details and history
- [ ] `/alerts/:id/edit` - Edit alert configuration

### Components to Build
- [ ] `AlertCard` - Display alert summary
- [ ] `AlertForm` - Create/edit alert form
- [ ] `ThresholdConfig` - Threshold configuration UI
- [ ] `StatisticsPanel` - Display KPI statistics (min, max, avg)
- [ ] `TriggerHistory` - Timeline of alert triggers
- [ ] `AlertTest` - Test alert button/modal

### Frontend Services
- [ ] `alertService.ts` - API client for alerts
- [ ] `statisticsService.ts` - API client for statistics

### Integration Tasks
- [ ] Add proxy configuration to `vite.config.ts`
- [ ] Add `/alerts` route to navigation
- [ ] Integrate with semantic layer for KPI selection
- [ ] Add TypeScript types from backend

## 🚀 Quick Start Guide

### 1. Install Backend Dependencies

```bash
cd nix-pm-backend
npm install
```

### 2. Create .env File

```bash
cp .env.example .env
```

The `.env` file is already configured with Azure PostgreSQL credentials.

### 3. Run Database Migrations

```bash
npm run migrate
```

This creates the necessary tables in the `pm_db` database.

### 4. Start Backend Server

```bash
npm run dev
```

Server will be available at `http://localhost:3001`

### 5. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Calculate KPI statistics
curl -X POST http://localhost:3001/api/statistics/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "kpi_name": "dl_pdcp_sdu_traffic_all_qci",
    "dataset_name": "kpi_global_15min",
    "time_window": "1day"
  }'

# Create a threshold alert
curl -X POST http://localhost:3001/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High PDCP Traffic",
    "description": "Alert when traffic exceeds threshold",
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
  }'

# List all alerts
curl http://localhost:3001/api/alerts

# Test an alert (dry run)
curl -X POST http://localhost:3001/api/alerts/1/test
```

## 📋 Next Steps

### Immediate (Week 3)
1. **Configure Vite Proxy**
   - Add backend proxy to `vite.config.ts`
   - Test CORS configuration

2. **Create Alerts Page**
   - List view with cards
   - Filter and search functionality
   - Enable/disable toggle
   - Delete confirmation

3. **Build Create Alert Wizard**
   - Step 1: Select KPI from semantic layer
   - Step 2: Configure thresholds and time window
   - Step 3: Preview statistics
   - Step 4: Test and save

### Short Term (Week 4)
1. **Alert Details Page**
   - Show configuration
   - Display current KPI statistics
   - Trigger history timeline
   - Edit/delete actions

2. **Statistics Visualization**
   - Chart showing KPI values over time
   - Threshold lines overlay
   - Highlight triggered periods

3. **Testing & Polish**
   - Error handling
   - Loading states
   - Responsive design
   - User feedback messages

### Future Enhancements
- [ ] Anomaly detection alerts (Phase 2)
- [ ] Email/Slack notifications
- [ ] Alert templates
- [ ] Bulk operations
- [ ] Alert groups/folders
- [ ] Custom SQL queries
- [ ] Export alert configuration
- [ ] Alert performance metrics

## 🔧 Configuration

### Threshold Alert Example

```json
{
  "name": "Revenue Drop Alert",
  "kpi_name": "total_revenue",
  "dataset_name": "kpi_global_15min",
  "alert_type": "threshold",
  "config": {
    "metric": "total_revenue",
    "threshold_lower": 1000,
    "comparison": "less_than",
    "time_window": "1hour",
    "aggregation": "sum"
  }
}
```

### Time Window Options

- `15min` - Last 15 minutes
- `1hour` - Last 1 hour
- `1day` - Last 24 hours
- `1week` - Last 7 days

### Aggregation Methods

- `avg` - Average value over period
- `sum` - Total sum over period
- `max` - Maximum value in period
- `min` - Minimum value in period

## 📊 Architecture

```
┌─────────────────────────────────────┐
│   NIx PM Frontend (React)           │
│   Port: 5173                        │
│   - Alerts Management UI            │
│   - Statistics Visualization        │
│   - Alert Configuration Wizard      │
└──────────────┬──────────────────────┘
               │ HTTP REST API
               │
┌──────────────▼──────────────────────┐
│   Backend Service (Express)         │
│   Port: 3001                        │
│   - Alert CRUD                      │
│   - Statistics Calculation          │
│   - Threshold Evaluation            │
│   - Alert Scheduler (cron)          │
└──────────────┬──────────────────────┘
               │ PostgreSQL
               │
┌──────────────▼──────────────────────┐
│   Azure PostgreSQL                  │
│   tfspain-postgres...azure.com      │
│   - kpi_global_15min (data)         │
│   - alerts (config)                 │
│   - alert_triggers (history)        │
│   - alert_statistics (cache)        │
└─────────────────────────────────────┘
```

## 📝 Notes

- Backend is fully functional and ready for integration
- Alert scheduler automatically runs every 5 minutes
- SSL connection to Azure PostgreSQL is configured
- All API endpoints are CORS-enabled for frontend
- Statistics are cached for 1 hour to improve performance
- Trigger history is preserved indefinitely
- Alerts can be enabled/disabled without deletion

## 🐛 Known Limitations

- Anomaly detection not implemented yet (Phase 2)
- No notification system (email/Slack) yet
- Frontend UI not started
- No user authentication on backend
- No rate limiting on API endpoints
- Alert scheduler runs in single process (not distributed)

## 🔗 Related Files

- `ALERTS_FEATURE_PLAN.md` - Detailed implementation plan
- `nix-pm-backend/README.md` - Backend service documentation
- `nix-pm-backend/.env.example` - Environment configuration template
