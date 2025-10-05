# NIx PM - Business Intelligence Platform

A modern, whitelabeled React application for embedding and managing Superset dashboards, charts, and alerts with a semantic layer for business users.

## Features

### Core Features
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Responsive Layout**: Collapsible sidebar with professional design
- **Whitelabeled**: All Superset branding replaced with NIx PM
- **Embedded Analytics**: Seamlessly embedded Superset dashboards and charts
- **Secure Authentication**: Integration with Superset API

### Dashboard & Chart Management
- List all dashboards with pagination (100+ items)
- View dashboards in standalone mode (`standalone=3`)
- Delete dashboards
- Export dashboards as ZIP files
- Create new dashboards inline
- List all charts with pagination (100+ items)
- View charts in explore mode
- Delete charts
- Export charts as ZIP files

### Semantic Layer for Chart Creation
- **Business User-Friendly**: No technical knowledge required
- **KPI Selection**: Organized by business categories
- **Chart Type Selection**: Categorized with descriptions
- **Spatial Aggregation**: Configure geographic levels (global, provincia, region, zipcode, celda, nodo)
- **Time Configuration**:
  - Granularity: 15 minutes, 1 hour, daily, weekly, monthly
  - Range: today, last week, last month, custom
- **Auto-detection**: Temporal columns automatically detected
- **Direct Integration**: Navigate to Superset explore with pre-configured form_data

### KPI Alerts System
- **Threshold Monitoring**: Configure alerts for KPI thresholds
- **Multiple Conditions**: Greater than, less than, equal to, not equal to
- **Configurable Frequency**: Check every 5min, 15min, 30min, 1h, 6h, 12h, 24h
- **Time Series Visualization**: Preview KPI data before creating alert
- **Spatial Aggregation**: Select geographic level for alerts
- **Backend Service**: Node.js/Express backend with PostgreSQL
- **Scheduler**: Background job processing with node-cron
- **Email Notifications**: Send alerts via SMTP

### Dataset Configuration
- **Settings Page**: Configure Superset datasets
- **Dynamic Table/View Loading**: Auto-discover PostgreSQL tables and views
- **KPI Mapping**: Associate KPIs with datasets
- **Aggregation Levels**: Configure spatial and temporal aggregations
- **CRUD Operations**: Full create, read, update, delete functionality

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     NIx PM Frontend                      │
│                  (React + TypeScript)                    │
│                    Port: 5173                           │
├─────────────────────────────────────────────────────────┤
│  Pages:                                                  │
│  • Login          • Dashboards      • Charts            │
│  • CreateChart    • CreateAlert     • Settings          │
│                                                          │
│  Services:                                               │
│  • supersetService      • semanticLayerService          │
│  • alertsService        • supersetDatasetsService       │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│              NIx PM Backend (Node.js/Express)           │
│                    Port: 3001                           │
├─────────────────────────────────────────────────────────┤
│  Routes:                                                 │
│  • /api/alerts              • /api/superset-datasets    │
│                                                          │
│  Services:                                               │
│  • Alert Scheduler (node-cron)                          │
│  • Email Service (nodemailer)                           │
│  • Database Service (PostgreSQL)                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│            Apache Superset (Docker)                     │
│                    Port: 8088                           │
├─────────────────────────────────────────────────────────┤
│  • Dashboards & Charts                                  │
│  • Datasets & SQL Lab                                   │
│  • REST API                                             │
│  • Embedded Mode (iframe)                               │
└─────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                           │
│                    Port: 5432                           │
├─────────────────────────────────────────────────────────┤
│  NIx PM Tables:                                         │
│  • kpi_alerts                                           │
│  • alert_notifications                                  │
│  • superset_datasets                                    │
│                                                          │
│  Analytics Tables:                                       │
│  • kpi_*  (spatial/temporal aggregations)               │
└─────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Superset instance running on `http://localhost:8088`
- Superset credentials (default: admin/admin)

### Installation

#### Frontend
```bash
cd nix-pm
npm install
```

#### Backend
```bash
cd nix-pm-backend
npm install
```

### Configuration

#### Frontend Environment
Create `.env` file in `nix-pm/`:
```env
VITE_API_URL=http://localhost:3001
```

#### Backend Environment
Create `.env` file in `nix-pm-backend/`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

SUPERSET_URL=http://localhost:8088
SUPERSET_USERNAME=admin
SUPERSET_PASSWORD=admin
```

#### Superset Configuration
See [SUPERSET_EMBEDDING_GUIDE.md](./SUPERSET_EMBEDDING_GUIDE.md) for detailed Superset configuration.

Key settings in `/app/docker/pythonpath_dev/superset_config.py`:
```python
# Disable Talisman to allow iframe embedding
TALISMAN_ENABLED = False

# Disable X-Frame-Options
HTTP_HEADERS = {}
X_FRAME_OPTIONS = ""

# Enable CORS
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["http://localhost:5173", "http://localhost:8088"]
}

# Session configuration
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False

# Disable CSRF (development only)
WTF_CSRF_ENABLED = False
```

### Database Setup

Run migrations:
```bash
cd nix-pm-backend
npm run migrate
```

Migrations include:
- `001_create_kpi_alerts.sql` - KPI alerts table
- `002_add_alert_frequency.sql` - Configurable alert frequency
- `003_create_alert_notifications.sql` - Alert notifications log
- `004_create_superset_datasets.sql` - Dataset configuration

### Development

#### Start Backend
```bash
cd nix-pm-backend
npm run dev
```

#### Start Frontend
```bash
cd nix-pm
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

#### Frontend
```bash
cd nix-pm
npm run build
```

#### Backend
```bash
cd nix-pm-backend
npm run build
```

## Usage

### Dashboard & Chart Management

1. Start your Superset instance on `http://localhost:8088`
2. Run the backend server: `cd nix-pm-backend && npm run dev`
3. Run the frontend server: `cd nix-pm && npm run dev`
4. Navigate to `http://localhost:5173`
5. Login with your Superset credentials (default: admin/admin)
6. View and interact with your dashboards and charts

### Creating Charts with Semantic Layer

1. Navigate to **Charts** page
2. Click **Create New Chart**
3. Configure:
   - **Spatial Aggregation**: Select geographic level
   - **Time Granularity**: Select temporal granularity (options filtered by spatial level)
   - **Time Range**: Select time period
4. Select KPIs from organized categories
5. Select chart type from categorized options
6. Click **Preview Chart** to open Superset explore
7. Customize and save your chart in Superset

### Creating KPI Alerts

1. Navigate to **Alerts** page
2. Click **Create New Alert**
3. Configure:
   - **Step 1**: Select KPI and spatial aggregation
   - **Step 2**: Set threshold condition and value
   - **Step 3**: Configure check frequency
   - **Step 4**: Enter recipient emails
4. Click **Create Alert**
5. Alert scheduler will monitor KPI and send notifications

### Configuring Datasets

1. Navigate to **Settings** page
2. Click **Add Dataset**
3. Select:
   - **Table/View**: Choose from available PostgreSQL tables/views
   - **Geographic Level**: Select spatial aggregation
   - **Time Aggregation**: Select temporal granularity
4. Select KPIs (filtered by table columns)
5. Click **Save**

## Project Structure

```
nix-pm/
├── public/                    # Static assets
│   └── logo.png              # NIx PM logo
├── src/
│   ├── components/           # React components
│   │   └── Layout.tsx        # Main layout with sidebar
│   ├── pages/                # Page components
│   │   ├── Login.tsx         # Authentication
│   │   ├── Dashboards.tsx    # Dashboard management
│   │   ├── Charts.tsx        # Chart management
│   │   ├── CreateChart.tsx   # Semantic layer chart creation
│   │   ├── CreateAlert.tsx   # KPI alert creation
│   │   └── Settings.tsx      # Dataset configuration
│   ├── services/             # API services
│   │   ├── superset.ts       # Superset API client
│   │   ├── semanticLayer.ts  # Semantic layer service
│   │   ├── alerts.ts         # Alerts API client
│   │   └── supersetDatasets.ts # Dataset configuration API
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── semantic.json             # KPI and chart type definitions
└── package.json

nix-pm-backend/
├── src/
│   ├── routes/               # API routes
│   │   ├── alerts.ts         # Alert endpoints
│   │   └── supersetDatasets.ts # Dataset endpoints
│   ├── services/             # Business logic
│   │   ├── database.ts       # PostgreSQL client
│   │   ├── scheduler.ts      # Alert scheduler (node-cron)
│   │   └── email.ts          # Email service (nodemailer)
│   └── index.ts              # Server entry point
├── migrations/               # Database migrations
│   ├── 001_create_kpi_alerts.sql
│   ├── 002_add_alert_frequency.sql
│   ├── 003_create_alert_notifications.sql
│   └── 004_create_superset_datasets.sql
└── package.json
```

## Semantic Layer

The semantic layer is defined in `semantic.json` and provides a business-friendly abstraction over technical datasets.

### Structure

```json
{
  "categories": [
    {
      "category": "Revenue",
      "kpi": [
        {
          "name": "total_revenue",
          "description": "Total revenue generated",
          "dataset": "sales_data"
        }
      ]
    }
  ],
  "chart_types": [
    {
      "id": "line",
      "name": "Line Chart",
      "category": "Evolution",
      "description": "Show trends over time"
    }
  ]
}
```

### Chart Type Mapping

Semantic layer IDs map to Superset viz_type:

| Semantic ID | Superset viz_type |
|-------------|------------------|
| line | echarts_timeseries_line |
| area | echarts_area |
| smooth_line | echarts_timeseries_smooth |
| stepped_line | echarts_timeseries_step |
| bar | echarts_timeseries_bar |
| column | echarts_timeseries_bar |
| pie | pie |
| donut | pie |
| table | table |
| big_number | big_number_total |

## Database Schema

### kpi_alerts
```sql
CREATE TABLE kpi_alerts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    kpi_name VARCHAR(255) NOT NULL,
    threshold_value DECIMAL NOT NULL,
    condition VARCHAR(50) NOT NULL,
    notification_emails TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    check_frequency VARCHAR(10) DEFAULT '1h',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### alert_notifications
```sql
CREATE TABLE alert_notifications (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES kpi_alerts(id),
    kpi_value DECIMAL NOT NULL,
    threshold_value DECIMAL NOT NULL,
    notification_sent BOOLEAN DEFAULT false,
    notification_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### superset_datasets
```sql
CREATE TABLE superset_datasets (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(255) NOT NULL UNIQUE,
    postgres_table VARCHAR(255) NOT NULL,
    geographic_level VARCHAR(50) NOT NULL,
    time_aggregation VARCHAR(50) NOT NULL,
    kpis JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_geographic_level CHECK (
        geographic_level IN ('global', 'provincia', 'region', 'zipcode', 'celda', 'nodo')
    ),
    CONSTRAINT valid_time_aggregation CHECK (
        time_aggregation IN ('15m', '1h', '1d', '1w', '1m')
    )
);
```

## API Endpoints

### Frontend → Backend

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alerts` | GET | List all alerts |
| `/api/alerts` | POST | Create new alert |
| `/api/alerts/:id` | GET | Get alert details |
| `/api/alerts/:id` | PUT | Update alert |
| `/api/alerts/:id` | DELETE | Delete alert |
| `/api/alerts/:id/timeseries` | GET | Get KPI timeseries data |
| `/api/superset-datasets` | GET | List all datasets |
| `/api/superset-datasets` | POST | Create dataset |
| `/api/superset-datasets/:id` | PUT | Update dataset |
| `/api/superset-datasets/:id` | DELETE | Delete dataset |
| `/api/superset-datasets/meta/tables` | GET | List available tables/views |
| `/api/superset-datasets/meta/tables/:name/columns` | GET | Get table columns |

### Frontend → Superset

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/security/login` | POST | Authenticate user |
| `/api/v1/dashboard/` | GET | List dashboards |
| `/api/v1/chart/` | GET | List charts |
| `/api/v1/dataset/` | GET | List datasets |
| `/api/v1/dataset/:id` | GET | Get dataset details |
| `/api/v1/chart/` | POST | Create chart |
| `/api/v1/chart/:id` | DELETE | Delete chart |
| `/api/v1/dashboard/:id` | DELETE | Delete dashboard |

## Technologies

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **Recharts** - Charts for timeseries
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **node-cron** - Job scheduler
- **nodemailer** - Email service
- **cors** - CORS middleware

### Infrastructure
- **Apache Superset** - BI platform
- **Docker** - Superset containerization
- **PostgreSQL** - Data storage

## Security Considerations

### Production Checklist

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Enable in production
3. **CSRF Protection**: Enable in Superset for production
4. **CORS**: Restrict origins to production domains
5. **Authentication**: Implement proper session management
6. **Email**: Use secure SMTP with app passwords
7. **Database**: Use connection pooling and parameterized queries
8. **Secrets**: Use environment variables for all secrets

## Troubleshooting

### Issue: Charts not loading
**Solution**: Ensure Superset is configured to allow iframe embedding. See [SUPERSET_EMBEDDING_GUIDE.md](./SUPERSET_EMBEDDING_GUIDE.md)

### Issue: Alerts not triggering
**Solution**: Check backend logs for scheduler errors. Verify Superset credentials in backend `.env`

### Issue: CORS errors
**Solution**: Verify CORS configuration in Superset `superset_config.py` includes frontend origin

### Issue: Database connection errors
**Solution**: Check PostgreSQL is running and credentials in `.env` are correct

### Issue: Email notifications not sending
**Solution**: Verify SMTP credentials. For Gmail, use app-specific passwords

## Documentation

- [Superset Embedding Guide](./SUPERSET_EMBEDDING_GUIDE.md) - Detailed Superset configuration
- [Alerts Feature Plan](./ALERTS_FEATURE_PLAN.md) - Alert system architecture

## License

MIT
