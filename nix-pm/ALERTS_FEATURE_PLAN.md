# KPI Alerts Feature - Implementation Plan

**Branch**: `feature/kpi-alerts`
**Status**: Planning Phase

## Overview

Implement a comprehensive alerting system for KPI monitoring with two types of alerts:
1. **Threshold-based alerts**: Simple rule-based alerts triggered when values exceed/fall below configured thresholds
2. **Anomaly detection alerts**: ML-based alerts that detect anomalies based on historical patterns

## Architecture

```
NIx PM Frontend (React)
    ↓
Backend API Service (Node.js/Express)
    ↓
PostgreSQL Database (Direct Connection)
    ↓
Alert Engine (Threshold + Anomaly Detection)
```

## Phase 1: Backend Infrastructure

### 1.1 Database Schema

Create new tables for alert management:

```sql
-- Alerts configuration table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  kpi_name VARCHAR(255) NOT NULL,
  dataset_name VARCHAR(255) NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'threshold' or 'anomaly'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  config JSONB NOT NULL -- Alert-specific configuration
);

-- Threshold alert configuration (stored in alerts.config)
{
  "metric": "SUM(revenue)",
  "threshold_upper": 10000,
  "threshold_lower": 1000,
  "comparison": "greater_than|less_than|between",
  "time_window": "1 hour|1 day|1 week",
  "aggregation": "avg|sum|max|min"
}

-- Anomaly alert configuration (stored in alerts.config)
{
  "metric": "SUM(revenue)",
  "sensitivity": "low|medium|high",
  "training_period_days": 30,
  "detection_method": "zscore|iqr|isolation_forest",
  "threshold_sigma": 3
}

-- Alert history/triggers table
CREATE TABLE alert_triggers (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  value DECIMAL,
  expected_value DECIMAL, -- For anomaly detection
  anomaly_score DECIMAL, -- For anomaly detection
  metadata JSONB, -- Additional context
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP
);

-- Alert statistics cache
CREATE TABLE alert_statistics (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  min_value DECIMAL,
  max_value DECIMAL,
  avg_value DECIMAL,
  median_value DECIMAL,
  stddev_value DECIMAL,
  period_start TIMESTAMP,
  period_end TIMESTAMP
);
```

### 1.2 Backend Service Setup

**Technology Stack**:
- **Runtime**: Node.js with Express
- **Database Client**: `pg` (node-postgres)
- **Anomaly Detection**: `simple-statistics` or `ml-kit` for basic ML
- **Scheduling**: `node-cron` for periodic alert checks
- **Environment**: `.env` file for database credentials

**File Structure**:
```
nix-pm-backend/
├── src/
│   ├── config/
│   │   └── database.ts          # PostgreSQL connection config
│   ├── models/
│   │   ├── Alert.ts             # Alert model
│   │   ├── AlertTrigger.ts      # Alert trigger model
│   │   └── AlertStatistics.ts   # Statistics model
│   ├── services/
│   │   ├── alertService.ts      # Core alert logic
│   │   ├── thresholdService.ts  # Threshold alert evaluation
│   │   ├── anomalyService.ts    # Anomaly detection logic
│   │   ├── statisticsService.ts # Calculate KPI statistics
│   │   └── schedulerService.ts  # Alert scheduling/checking
│   ├── routes/
│   │   ├── alerts.ts            # Alert CRUD endpoints
│   │   ├── statistics.ts        # Statistics endpoints
│   │   └── triggers.ts          # Alert trigger history
│   ├── middleware/
│   │   └── auth.ts              # Authentication middleware
│   └── index.ts                 # Express app entry point
├── package.json
├── tsconfig.json
└── .env.example
```

**Dependencies**:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "simple-statistics": "^7.8.3",
    "node-cron": "^3.0.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/pg": "^8.10.9",
    "@types/cors": "^2.8.17",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3"
  }
}
```

### 1.3 API Endpoints

```typescript
// Alert Management
POST   /api/alerts                 # Create new alert
GET    /api/alerts                 # List all alerts (with pagination)
GET    /api/alerts/:id             # Get alert details
PUT    /api/alerts/:id             # Update alert
DELETE /api/alerts/:id             # Delete alert
POST   /api/alerts/:id/test        # Test alert (dry run)
PUT    /api/alerts/:id/enable      # Enable alert
PUT    /api/alerts/:id/disable     # Disable alert

// Statistics
GET    /api/alerts/:id/statistics  # Get KPI statistics for alert
POST   /api/statistics/calculate   # Calculate statistics for KPI
                                   # Body: { kpi, dataset, period }

// Alert Triggers/History
GET    /api/alerts/:id/triggers    # Get trigger history for alert
GET    /api/triggers               # Get all recent triggers
PUT    /api/triggers/:id/resolve   # Mark trigger as resolved

// KPI Data
GET    /api/kpis/:name/data        # Get raw KPI data from database
                                   # Query params: dataset, start_date, end_date
POST   /api/kpis/query             # Execute custom KPI query
```

## Phase 2: Frontend Implementation

### 2.1 New Pages/Components

**File Structure**:
```
src/
├── pages/
│   ├── Alerts.tsx                      # Main alerts listing page
│   ├── CreateAlert.tsx                 # Create new alert wizard
│   ├── AlertDetails.tsx                # View/edit alert details
│   └── AlertTriggers.tsx               # Alert trigger history
├── components/
│   ├── alerts/
│   │   ├── AlertCard.tsx               # Alert display card
│   │   ├── ThresholdConfig.tsx         # Threshold alert configuration
│   │   ├── AnomalyConfig.tsx           # Anomaly alert configuration
│   │   ├── StatisticsPanel.tsx         # Display KPI statistics
│   │   ├── AlertHistoryChart.tsx       # Visualization of triggers
│   │   └── AlertTestModal.tsx          # Test alert modal
├── services/
│   ├── alertService.ts                 # Alert API client
│   └── statisticsService.ts            # Statistics API client
└── types/
    └── alerts.ts                       # TypeScript interfaces
```

### 2.2 Alert Creation Workflow

**Step 1: Select KPI**
- Use existing semantic layer to browse KPIs
- Select dataset/table
- Choose KPI metric

**Step 2: Choose Alert Type**
- Threshold-based alert
- Anomaly detection alert

**Step 3a: Configure Threshold Alert**
- Display KPI statistics (min, max, avg, median)
- User inputs:
  - Upper threshold (optional)
  - Lower threshold (optional)
  - Time window for aggregation
  - Aggregation method (avg, sum, max, min)

**Step 3b: Configure Anomaly Detection Alert**
- Display historical pattern visualization
- User inputs:
  - Sensitivity level (low/medium/high)
  - Training period (7/14/30/60 days)
  - Detection method (Z-score, IQR, Isolation Forest)

**Step 4: Alert Settings**
- Alert name
- Description
- Notification preferences (future: email, Slack, etc.)
- Check frequency (every 5min, 15min, 1hour, 1day)

**Step 5: Test & Save**
- Dry run to show if alert would trigger now
- Save configuration

### 2.3 UI Components

**Alerts Page** (`/alerts`):
```tsx
- Header with "Create New Alert" button
- Filter/search bar (by KPI, type, status)
- Alert cards grid showing:
  - Alert name & description
  - KPI being monitored
  - Alert type badge
  - Status (enabled/disabled)
  - Last triggered time
  - Quick actions (edit, delete, enable/disable)
```

**Create Alert Page** (`/alerts/create`):
```tsx
- Multi-step wizard with progress indicator
- Step 1: KPI selection (reuse semantic layer UI)
- Step 2: Alert type selection (cards with descriptions)
- Step 3: Configuration form (dynamic based on type)
- Step 4: Review & save
```

**Alert Details Page** (`/alerts/:id`):
```tsx
- Alert configuration overview
- KPI statistics panel
- Trigger history timeline
- Actions: Edit, Delete, Enable/Disable, Test
- Visualization of historical values vs thresholds/anomalies
```

## Phase 3: Alert Engine Implementation

### 3.1 Threshold Alert Logic

```typescript
interface ThresholdAlert {
  metric: string;
  threshold_upper?: number;
  threshold_lower?: number;
  time_window: string;
  aggregation: 'avg' | 'sum' | 'max' | 'min';
}

async function evaluateThresholdAlert(alert: Alert): Promise<boolean> {
  // 1. Query database for KPI data within time window
  const data = await queryKPIData(alert.kpi_name, alert.dataset_name, alert.config.time_window);

  // 2. Apply aggregation function
  const value = aggregateData(data, alert.config.aggregation);

  // 3. Check against thresholds
  if (alert.config.threshold_upper && value > alert.config.threshold_upper) {
    return triggerAlert(alert, value, 'exceeded_upper');
  }

  if (alert.config.threshold_lower && value < alert.config.threshold_lower) {
    return triggerAlert(alert, value, 'below_lower');
  }

  return false;
}
```

### 3.2 Anomaly Detection Logic

**Z-Score Method** (default):
```typescript
interface AnomalyAlert {
  metric: string;
  sensitivity: 'low' | 'medium' | 'high';
  training_period_days: number;
  threshold_sigma: number;
}

async function evaluateAnomalyAlert(alert: Alert): Promise<boolean> {
  // 1. Get historical data for training period
  const historicalData = await queryHistoricalKPIData(
    alert.kpi_name,
    alert.dataset_name,
    alert.config.training_period_days
  );

  // 2. Calculate statistics
  const mean = calculateMean(historicalData);
  const stdDev = calculateStandardDeviation(historicalData);

  // 3. Get current value
  const currentValue = await queryCurrentKPIValue(alert.kpi_name, alert.dataset_name);

  // 4. Calculate Z-score
  const zScore = (currentValue - mean) / stdDev;

  // 5. Map sensitivity to sigma threshold
  const sigmaThreshold = {
    'low': 3,     // ~99.7% confidence
    'medium': 2,  // ~95% confidence
    'high': 1.5   // ~86% confidence
  }[alert.config.sensitivity];

  // 6. Check if anomaly
  if (Math.abs(zScore) > sigmaThreshold) {
    return triggerAlert(alert, currentValue, 'anomaly', {
      expected_value: mean,
      z_score: zScore,
      std_dev: stdDev
    });
  }

  return false;
}
```

**Alternative: IQR Method**:
```typescript
function detectAnomalyIQR(data: number[], currentValue: number): boolean {
  const sorted = data.sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return currentValue < lowerBound || currentValue > upperBound;
}
```

### 3.3 Scheduler

```typescript
import cron from 'node-cron';

function startAlertScheduler() {
  // Check alerts every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running alert checks...');

    const activeAlerts = await getActiveAlerts();

    for (const alert of activeAlerts) {
      try {
        if (alert.alert_type === 'threshold') {
          await evaluateThresholdAlert(alert);
        } else if (alert.alert_type === 'anomaly') {
          await evaluateAnomalyAlert(alert);
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alert.id}:`, error);
      }
    }
  });
}
```

## Phase 4: Database Connection

### 4.1 PostgreSQL Connection Setup

**Questions for you:**
1. What are the PostgreSQL connection details?
   - Host
   - Port
   - Database name
   - Username/Password (or use environment variables)

2. Are the datasets/tables already in Superset's metadata database or a separate analytics database?

3. Do you have sample table schemas for the KPI data?

4. What is the typical structure of the time-series data? Example:
   ```sql
   timestamp | kpi_name | value
   ----------|----------|-------
   ...
   ```

### 4.2 Connection Service

```typescript
// src/config/database.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function queryDatabase(sql: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}
```

## Phase 5: Integration & Testing

### 5.1 Integration Checklist

- [ ] Backend service running on separate port (e.g., 3001)
- [ ] CORS configured for frontend origin (http://localhost:5173)
- [ ] Database migrations executed
- [ ] Environment variables configured
- [ ] Frontend proxy configured in vite.config.ts
- [ ] Authentication integrated (reuse Superset credentials?)

### 5.2 Testing Scenarios

**Threshold Alerts**:
- [ ] Alert triggers when value exceeds upper threshold
- [ ] Alert triggers when value falls below lower threshold
- [ ] Alert does not trigger when value is within range
- [ ] Statistics display correctly (min, max, avg)
- [ ] Multiple time windows work (1h, 1d, 1w)

**Anomaly Detection**:
- [ ] Z-score method detects anomalies correctly
- [ ] Different sensitivity levels work as expected
- [ ] Training period affects detection accuracy
- [ ] Historical pattern visualization displays correctly

**UI/UX**:
- [ ] Alert creation wizard flows smoothly
- [ ] KPI selection integrates with semantic layer
- [ ] Alert cards display all relevant information
- [ ] Trigger history shows timeline correctly
- [ ] Test alert functionality works

## Implementation Timeline

### Week 1: Backend Foundation
- [ ] Set up backend project structure
- [ ] Create database schema and migrations
- [ ] Implement database connection service
- [ ] Create basic CRUD endpoints for alerts

### Week 2: Alert Engine
- [ ] Implement threshold alert logic
- [ ] Implement statistics calculation service
- [ ] Implement anomaly detection (Z-score method)
- [ ] Set up scheduler for alert checking

### Week 3: Frontend UI
- [ ] Create Alerts page with listing
- [ ] Build CreateAlert wizard
- [ ] Implement threshold configuration form
- [ ] Implement anomaly configuration form
- [ ] Add alert service client

### Week 4: Integration & Polish
- [ ] Integrate with semantic layer
- [ ] Build AlertDetails page
- [ ] Add trigger history visualization
- [ ] Testing and bug fixes
- [ ] Documentation

## Technology Decisions

### Backend Framework: Express.js
**Pros**:
- Lightweight and fast
- Easy integration with PostgreSQL
- Good TypeScript support
- Simple to deploy

**Alternatives considered**:
- NestJS (more opinionated, heavier)
- Fastify (faster but less ecosystem)

### Anomaly Detection: Simple Statistics
**Pros**:
- No ML dependencies needed for basic detection
- Z-score and IQR are proven methods
- Fast computation
- Easy to explain to users

**Future enhancements**:
- Prophet (Facebook's time series forecasting)
- TensorFlow.js for more advanced ML
- Integration with Python-based models

### Scheduling: node-cron
**Pros**:
- Simple cron-like syntax
- Runs in-process (no external scheduler needed)
- Lightweight

**Alternatives for future**:
- Bull (Redis-based queue for distributed systems)
- Agenda (MongoDB-based job scheduling)

## Security Considerations

- [ ] Validate all user inputs with Zod schemas
- [ ] SQL injection prevention (use parameterized queries)
- [ ] Rate limiting on API endpoints
- [ ] Authentication required for all endpoints
- [ ] Environment variables for sensitive data
- [ ] Database user with minimal permissions

## Deployment Considerations

### Development
- Backend runs on `http://localhost:3001`
- Frontend proxy configured in Vite
- PostgreSQL connection to existing database

### Production (Future)
- Backend deployed as separate service
- Environment-based configuration
- Database connection pooling
- Monitoring and logging
- Alert notification system (email, Slack, webhooks)

## Next Steps

1. **Confirm database access details** (see Phase 4.1 questions)
2. **Review and approve this plan**
3. **Set up backend project structure**
4. **Create database schema**
5. **Begin implementation**

## Questions for Product Owner

1. **Database Access**: Can you provide the PostgreSQL connection details?

2. **Data Structure**: What does the KPI data table look like? Can you share a sample schema?

3. **Authentication**: Should we reuse Superset authentication or create a separate auth system?

4. **Notifications**: For this phase, should we focus only on in-app alerts, or also include email/Slack notifications?

5. **Permissions**: Should all users be able to create/manage alerts, or should there be role-based access?

6. **Alert Frequency**: What's the minimum check frequency you'd like to support? (5 min, 1 min, real-time?)

7. **Historical Data**: How much historical data is available for anomaly detection training? (30 days, 90 days, 1 year?)

8. **Priority**: Which alert type should we implement first - threshold or anomaly detection?
