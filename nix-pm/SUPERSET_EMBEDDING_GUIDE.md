# Superset Embedding Configuration Guide for NIx PM

This guide explains how to configure Apache Superset for embedding dashboards and charts in the NIx PM React application.

## Overview

NIx PM is a whitelabeled Business Intelligence application that embeds Apache Superset dashboards and charts. This setup provides a seamless, branded experience while leveraging Superset's powerful analytics capabilities.

## Architecture

```
NIx PM (React App on :5173)
    ↓
Superset API (:8088)
    ↓
Embedded Dashboards/Charts (iframes)
```

## Superset Configuration

### 1. Enable Embedded Superset Feature

The Superset configuration is split into two files in Docker:

1. **`superset_config.py`**: Base configuration (do not modify)
2. **`superset_config_docker.py`**: Custom configuration that overrides base settings

Create or update `/app/docker/pythonpath_dev/superset_config_docker.py` with the following configuration:

```python
# Configuration for embedding Superset in NIx PM

# Enable embedding features
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_RBAC": True
}

# Guest token configuration
GUEST_ROLE_NAME = "Public"
GUEST_TOKEN_JWT_SECRET = "test-guest-secret-change-me"  # CHANGE IN PRODUCTION!
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 300  # 5 minutes

# CORS configuration for localhost:5173
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["http://localhost:5173", "http://localhost:8088"]
}

# Talisman configuration for iframe embedding
TALISMAN_ENABLED = False

# Disable X-Frame-Options header completely
HTTP_HEADERS = {}
X_FRAME_OPTIONS = ""

# Session configuration
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = False

# Disable CSRF (development only)
WTF_CSRF_ENABLED = False
WTF_CSRF_EXEMPT_LIST = [".*"]

# Enable embedded routes
PREVENT_UNSAFE_DEFAULT_URLS_ON_DATASET = False
```

**Note:** The `superset_config.py` file automatically imports `superset_config_docker.py` at the end, so any settings in `superset_config_docker.py` will override the base configuration.

### 2. Docker Configuration

Create the configuration file in the Docker container:

```bash
docker exec superset_app bash -c 'cat > /app/docker/pythonpath_dev/superset_config_docker.py << "EOF"
# Configuration for embedding Superset in NIx PM

# Enable embedding features
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_RBAC": True
}

# Guest token configuration
GUEST_ROLE_NAME = "Public"
GUEST_TOKEN_JWT_SECRET = "test-guest-secret-change-me"
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 300

# CORS configuration for localhost:5173
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["http://localhost:5173", "http://localhost:8088"]
}

# Talisman configuration for iframe embedding
TALISMAN_ENABLED = False

# Disable X-Frame-Options header completely
HTTP_HEADERS = {}
X_FRAME_OPTIONS = ""

# Session configuration
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False

# Disable CSRF (development only)
WTF_CSRF_ENABLED = False
WTF_CSRF_EXEMPT_LIST = [".*"]

# Enable embedded routes
PREVENT_UNSAFE_DEFAULT_URLS_ON_DATASET = False
EOF
'
```

**Important:** Configuration files are located in the project root for reference:
- `/Users/alejandromedina/dev/FC/PM/superset_config.py` (base config - read-only)
- `/Users/alejandromedina/dev/FC/PM/superset_config_docker.py` (custom config - editable)

### 3. Restart Superset

```bash
docker restart superset_app
```

### 4. Initialize Superset

```bash
docker exec superset_app superset init
```

### 5. Create Public Role (Optional)

For guest token authentication:

```bash
docker exec superset_app python << 'EOF'
from superset import security_manager
from flask import Flask
from superset.app import create_app

app = create_app()
with app.app_context():
    public_role = security_manager.find_role("Public")
    if not public_role:
        security_manager.add_role("Public")
        public_role = security_manager.find_role("Public")

    # Add permissions for dashboards and charts
    perms = [
        ("can_read", "Dashboard"),
        ("can_read", "Chart"),
    ]

    for perm_name, view_name in perms:
        pv = security_manager.find_permission_view_menu(perm_name, view_name)
        if pv and pv not in public_role.permissions:
            security_manager.add_permission_role(public_role, pv)

    print("Public role configured successfully")
EOF
```

## Frontend Integration

### 1. Install Dependencies

```bash
npm install axios react-router-dom lucide-react
npm install @superset-ui/embedded-sdk  # For SDK-based embedding
```

### 2. Superset Service (`src/services/superset.ts`)

Create a service to handle Superset API interactions:

```typescript
import axios from 'axios';

const SUPERSET_URL = import.meta.env.DEV ? '' : 'http://localhost:8088';

export interface SupersetCredentials {
  username: string;
  password: string;
}

class SupersetService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private credentials: SupersetCredentials | null = null;

  async login(credentials: SupersetCredentials): Promise<void> {
    const response = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
      username: credentials.username,
      password: credentials.password,
      provider: 'db',
      refresh: true,
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.credentials = credentials;

    // Store credentials in sessionStorage for persistence
    sessionStorage.setItem('superset_credentials', JSON.stringify(credentials));
    sessionStorage.setItem('superset_access_token', this.accessToken);
  }

  // Restore session from sessionStorage
  restoreSession(): boolean {
    const storedToken = sessionStorage.getItem('superset_access_token');
    const storedCreds = sessionStorage.getItem('superset_credentials');

    if (storedToken && storedCreds) {
      this.accessToken = storedToken;
      this.credentials = JSON.parse(storedCreds);
      return true;
    }
    return false;
  }

  async getGuestToken(resources: { type: string; id: string }[]): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await axios.post(
      `${SUPERSET_URL}/api/v1/security/guest_token/`,
      {
        user: {
          username: 'guest',
          first_name: 'Guest',
          last_name: 'User',
        },
        resources: resources,
        rls: [],
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.token;
  }

  async getDashboards(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Paginated fetch to get all dashboards (100+ items)
    let allDashboards: any[] = [];
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        params: {
          q: JSON.stringify({
            page: page,
            page_size: pageSize
          })
        }
      });

      const results = response.data.result || [];
      allDashboards = allDashboards.concat(results);
      hasMore = results.length === pageSize;
      page++;
    }

    return allDashboards;
  }

  async getCharts(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Paginated fetch to get all charts (100+ items)
    let allCharts: any[] = [];
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${SUPERSET_URL}/api/v1/chart/`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        params: {
          q: JSON.stringify({
            page: page,
            page_size: pageSize
          })
        }
      });

      const results = response.data.result || [];
      allCharts = allCharts.concat(results);
      hasMore = results.length === pageSize;
      page++;
    }

    return allCharts;
  }

  async getDatasets(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await axios.get(`${SUPERSET_URL}/api/v1/dataset/`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params: {
        q: JSON.stringify({
          page: 0,
          page_size: 100
        })
      }
    });

    return response.data.result || [];
  }

  async getDatasetDetails(datasetId: number): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await axios.get(`${SUPERSET_URL}/api/v1/dataset/${datasetId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data.result;
  }

  async createChart(chartData: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await axios.post(
      `${SUPERSET_URL}/api/v1/chart/`,
      chartData,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async deleteChart(chartId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    await axios.delete(`${SUPERSET_URL}/api/v1/chart/${chartId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  async deleteDashboard(dashboardId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    await axios.delete(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.credentials = null;
    sessionStorage.removeItem('superset_credentials');
    sessionStorage.removeItem('superset_access_token');
  }
}

export const supersetService = new SupersetService();
```

### 3. Vite Proxy Configuration

Configure Vite to proxy API requests to Superset (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
```

## Embedding Methods

### Method 1: Superset Embedded SDK (Recommended for SDK Support)

```typescript
import { embedDashboard } from '@superset-ui/embedded-sdk';

const embedDashboardContent = async (dashboardUuid: string) => {
  const guestToken = await supersetService.getGuestToken([
    { type: 'dashboard', id: String(dashboardId) },
  ]);

  const container = document.getElementById('dashboard-container');
  if (container) {
    embedDashboard({
      id: dashboardUuid,
      supersetDomain: 'http://localhost:8088',
      mountPoint: container,
      fetchGuestToken: () => guestToken,
      dashboardUiConfig: {
        hideTitle: false,
        hideTab: false,
        hideChartControls: false,
      },
    });
  }
};
```

**Note:** This method requires Superset to have the `/embedded/` endpoint enabled. If you get 404 errors, use Method 2.

### Method 2: Direct iframe Embedding (Current Implementation)

This is the method currently used in NIx PM and works reliably with all Superset versions:

```typescript
<iframe
  src={`http://localhost:8088/superset/dashboard/${dashboard.id}/?standalone=3`}
  className="w-full h-full border-0"
  title={dashboard.dashboard_title}
  allow="fullscreen"
/>
```

For charts:

```typescript
<iframe
  src={`http://localhost:8088/explore/?form_data=%7B%22slice_id%22%3A${chart.id}%7D&standalone=3`}
  className="w-full h-full border-0"
  title={chart.slice_name}
  allow="fullscreen"
/>
```

**Advantages:**
- Works with all Superset versions
- No dependency on embedded SDK
- `standalone=3` parameter hides Superset navigation
- Simple and reliable

**Disadvantages:**
- Less control over UI customization
- Requires proper CORS and X-Frame-Options configuration

## Key Configuration Parameters

### Guest Token Parameters

- **id**: Must be a STRING, not a number (e.g., `"11"` not `11`)
- **type**: Either `"dashboard"` or `"chart"`
- **rls**: Row-level security rules (empty array for no restrictions)

### Standalone Mode

The `standalone=3` parameter in the iframe URL provides:
- Clean interface without Superset navigation
- Optimal for embedding
- Full dashboard/chart functionality

### CORS Configuration

Essential CORS settings for embedding:
```python
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["http://localhost:5173", "http://localhost:8088"]
}
```

## Security Considerations

### Production Checklist

1. **Change JWT Secret**:
   ```python
   GUEST_TOKEN_JWT_SECRET = "your-strong-secret-here"
   ```

2. **Enable HTTPS**:
   ```python
   SESSION_COOKIE_SECURE = True
   ```

3. **Restrict CORS Origins**:
   ```python
   CORS_OPTIONS = {
       "origins": ["https://yourdomain.com"]
   }
   ```

4. **Enable CSRF Protection**:
   ```python
   WTF_CSRF_ENABLED = True
   WTF_CSRF_EXEMPT_LIST = []  # Or specific endpoints
   ```

5. **Set Proper X-Frame-Options**:
   ```python
   HTTP_HEADERS = {"X-Frame-Options": "SAMEORIGIN"}
   # Or allow specific domains
   ```

6. **Use Environment Variables**:
   ```python
   import os
   GUEST_TOKEN_JWT_SECRET = os.getenv('SUPERSET_JWT_SECRET')
   ```

## Troubleshooting

### Issue: 404 on /embedded/ endpoint

**Solution**: Use Method 2 (iframe embedding) instead of the SDK. This is what NIx PM currently uses.

### Issue: CSRF Token Missing

**Solution**: Disable CSRF for development:
```python
WTF_CSRF_ENABLED = False
```

For production, implement proper CSRF token handling.

### Issue: Guest Token "Not a valid string"

**Solution**: Ensure the dashboard/chart ID is converted to string:
```typescript
{ type: 'dashboard', id: String(dashboardId) }
```

### Issue: iframe blocked by X-Frame-Options

**Solution**: Set `X-Frame-Options` to `ALLOWALL` or `SAMEORIGIN`:
```python
HTTP_HEADERS = {"X-Frame-Options": "ALLOWALL"}
```

### Issue: CORS errors

**Solution**: Verify CORS configuration includes your frontend origin:
```python
CORS_OPTIONS = {
    "origins": ["http://localhost:5173"]
}
```

## Current NIx PM Implementation

NIx PM uses **Method 2 (Direct iframe Embedding)** because:

1. ✅ Works reliably with Superset 5.0
2. ✅ No dependency on embedded endpoint availability
3. ✅ Simple implementation
4. ✅ Full dashboard/chart functionality
5. ✅ Whitelabeled with "NIx PM" branding
6. ✅ Professional UI with custom styling

### Key Features

1. **Dashboard Management**
   - List all dashboards with pagination (100+ items)
   - View dashboards in standalone mode (`standalone=3`)
   - Delete dashboards
   - Export dashboards as ZIP files
   - Create new dashboards inline

2. **Chart Management**
   - List all charts with pagination (100+ items)
   - View charts in explore mode
   - Delete charts
   - Export charts as ZIP files
   - Create charts via semantic layer

3. **Semantic Layer Chart Creation**
   - Business user-friendly interface
   - KPI selection from organized categories
   - Chart type selection with descriptions
   - Time granularity configuration (15m, 1h, daily)
   - Time range configuration (today, last week, etc.)
   - Auto-detection of temporal columns
   - Direct navigation to Superset explore with pre-configured form_data

4. **Session Persistence**
   - Credentials stored in sessionStorage
   - Auto-restore session on page reload
   - Seamless user experience

5. **API Pagination**
   - Automatic pagination for large datasets
   - Fetches all items across multiple pages
   - Works with 100+ charts and dashboards

## Chart Creation with Semantic Layer

NIx PM includes a semantic layer that defines KPIs and chart types, enabling business users to create charts without technical knowledge.

### Semantic Layer Structure (`semantic.json`)

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

### Chart Creation Workflow

1. **User selects configuration**:
   - Time granularity (15 minutes, 1 hour, daily)
   - Time range (none, today, last 7 days, etc.)

2. **User selects KPIs** from semantic layer categories

3. **User selects chart type** from categorized options

4. **System builds form_data**:
   ```typescript
   const formData = {
     datasource: `${datasetId}__table`,
     viz_type: 'echarts_timeseries_line',
     granularity_sqla: 'timestamp',
     time_range: 'Last week',
     time_grain_sqla: 'P1D',
     metrics: [
       {
         expressionType: 'SQL',
         sqlExpression: 'SUM(total_revenue)',
         label: 'total_revenue',
         optionName: 'metric_total_revenue_0'
       }
     ],
     adhoc_filters: []
   };
   ```

5. **Navigate to Superset explore**:
   ```typescript
   const formDataEncoded = encodeURIComponent(JSON.stringify(formData));
   const exploreUrl = `http://localhost:8088/superset/explore/?datasource_type=table&datasource_id=${datasetId}&form_data=${formDataEncoded}`;
   ```

6. **User configures and saves** chart in Superset

### Chart Type Mapping

Semantic layer uses simplified IDs that map to Superset's viz_type:

```typescript
const vizTypeMapping: Record<string, string> = {
  'line': 'echarts_timeseries_line',
  'area': 'echarts_area',
  'bar': 'echarts_timeseries_bar',
  'pie': 'pie',
  'table': 'table',
  // ... more mappings
};
```

### Time Granularity ISO 8601 Format

- `PT15M` - 15 minutes
- `PT1H` - 1 hour
- `P1D` - Daily
- `P1W` - Weekly
- `P1M` - Monthly

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/security/login` | POST | Authenticate user and get access token |
| `/api/v1/security/guest_token/` | POST | Generate guest token for embedding |
| `/api/v1/dashboard/` | GET | List all dashboards (paginated) |
| `/api/v1/chart/` | GET | List all charts (paginated) |
| `/api/v1/dataset/` | GET | List all datasets |
| `/api/v1/dataset/{id}` | GET | Get dataset details including columns |
| `/api/v1/chart/` | POST | Create new chart |
| `/api/v1/chart/{id}` | DELETE | Delete chart |
| `/api/v1/dashboard/{id}` | DELETE | Delete dashboard |
| `/superset/dashboard/{id}/` | GET | View dashboard (in iframe) |
| `/superset/explore/` | GET | View/create chart (in iframe) |

## Testing the Configuration

1. **Start Superset**: `docker-compose up -d`
2. **Verify Superset**: Navigate to `http://localhost:8088`
3. **Test API Login**:
   ```bash
   curl -X POST http://localhost:8088/api/v1/security/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin","provider":"db","refresh":true}'
   ```
4. **Start NIx PM**: `npm run dev`
5. **Access Application**: Navigate to `http://localhost:5173`
6. **Login**: Use `admin/admin` credentials

## Resources

- [Superset Documentation](https://superset.apache.org/docs/intro)
- [Superset Embedded SDK](https://www.npmjs.com/package/@superset-ui/embedded-sdk)
- [Superset API Documentation](https://superset.apache.org/docs/api)

## License

This configuration guide is part of the NIx PM project. See main project LICENSE for details.
