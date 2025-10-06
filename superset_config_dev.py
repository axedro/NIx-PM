
# ============================================================================
# CONFIGURATION FOR EMBEDDING SUPERSET IN NIx PM
# ============================================================================

# Feature flags
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

# Talisman configuration for iframe embedding
TALISMAN_ENABLED = True

# Custom CSP configuration for development - more permissive
TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'self'", "http://localhost:5173", "http://localhost:8088", "http://localhost"]
    },
    "force_https": False,
    "frame_options": None,
    "content_security_policy_nonce_in": []
}

# IMPORTANT: For development mode, Talisman uses DEV config
TALISMAN_DEV_CONFIG = TALISMAN_CONFIG

# CORS configuration
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ["http://localhost:5173", "http://localhost:8088", "http://localhost"]
}

# CSRF configuration (development only)
WTF_CSRF_ENABLED = False
WTF_CSRF_EXEMPT_LIST = [".*"]

# Other settings
PREVENT_UNSAFE_DEFAULT_URLS_ON_DATASET = False
