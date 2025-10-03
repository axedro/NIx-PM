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

Add the following configuration to your Superset config file (`superset_config.py`):

```python
# Enable embedding configuration
FEATURE_FLAGS["EMBEDDED_SUPERSET"] = True
FEATURE_FLAGS["DASHBOARD_NATIVE_FILTERS"] = True
FEATURE_FLAGS["DASHBOARD_CROSS_FILTERS"] = True
FEATURE_FLAGS["DASHBOARD_RBAC"] = True

# Guest token configuration
GUEST_ROLE_NAME = "Public"
GUEST_TOKEN_JWT_SECRET = "test-guest-secret-change-me"  # CHANGE IN PRODUCTION!
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 300  # 5 minutes

# CORS configuration
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["http://localhost:5173", "http://localhost:8088"]
}

# Talisman configuration to allow embedding
TALISMAN_ENABLED = False
HTTP_HEADERS = {"X-Frame-Options": "ALLOWALL"}

# Session configuration
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = False

# Disable CSRF for API endpoints (development only)
WTF_CSRF_ENABLED = False
WTF_CSRF_EXEMPT_LIST = [".*"]

# Enable embedded routes
PREVENT_UNSAFE_DEFAULT_URLS_ON_DATASET = False
```

### 2. Docker Configuration

If using Docker, add the configuration to the mounted config file:

```bash
docker exec superset_app bash -c 'cat >> /app/docker/pythonpath_dev/superset_config.py << "EOF"
# [Add configuration from above]
EOF
'
```

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

  async login(credentials: SupersetCredentials): Promise<void> {
    const response = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
      username: credentials.username,
      password: credentials.password,
      provider: 'db',
      refresh: true,
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
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

    const response = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data.result;
  }

  async getCharts(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await axios.get(`${SUPERSET_URL}/api/v1/chart/`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.data.result;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
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

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/security/login` | POST | Authenticate user and get access token |
| `/api/v1/security/guest_token/` | POST | Generate guest token for embedding |
| `/api/v1/dashboard/` | GET | List all dashboards |
| `/api/v1/chart/` | GET | List all charts |
| `/superset/dashboard/{id}/` | GET | View dashboard (in iframe) |
| `/explore/` | GET | View chart (in iframe) |

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
