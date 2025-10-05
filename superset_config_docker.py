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
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "frame-ancestors": ["http://localhost:5173", "http://localhost:8088"]
    },
    "force_https": False
}

# Session configuration
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False

# Disable CSRF (development only)
WTF_CSRF_ENABLED = False
WTF_CSRF_EXEMPT_LIST = [".*"]

# Enable embedded routes
PREVENT_UNSAFE_DEFAULT_URLS_ON_DATASET = False
