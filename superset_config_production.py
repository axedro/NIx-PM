# Configuration for embedding Superset in NIx PM - PRODUCTION
# This file should be used in production environments with HTTPS

# ============================================================================
# FEATURE FLAGS
# ============================================================================
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_RBAC": True
}

# ============================================================================
# GUEST TOKEN CONFIGURATION
# ============================================================================
GUEST_ROLE_NAME = "Public"
GUEST_TOKEN_JWT_SECRET = "CHANGE-THIS-TO-A-STRONG-SECRET-KEY-IN-PRODUCTION"  # MUST CHANGE!
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 300

# ============================================================================
# TALISMAN CONFIGURATION FOR IFRAME EMBEDDING - PRODUCTION
# ============================================================================
TALISMAN_ENABLED = True

# Production CSP - More strict, uses nonces for scripts
TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'strict-dynamic'"],  # More secure with nonces
        "style-src": ["'self'", "'unsafe-inline'"],    # Keep for styles (needed by Superset)
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'", "https://your-api-domain.com"],
        "frame-ancestors": [
            "'self'",
            "https://your-frontend-domain.com",  # CHANGE TO YOUR PRODUCTION DOMAIN
            "https://*.your-domain.com"          # Allow subdomains if needed
        ]
    },
    "force_https": True,  # IMPORTANT: Force HTTPS in production
    "frame_options": None,
    "content_security_policy_nonce_in": ["script-src"]  # Use nonces for scripts
}

# For production, use the same config (not in debug mode)
TALISMAN_DEV_CONFIG = TALISMAN_CONFIG

# ============================================================================
# CORS CONFIGURATION - PRODUCTION
# ============================================================================
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": [
        "Content-Type",
        "Authorization",
        "X-GuestToken",
        "X-Requested-With"
    ],  # Specific headers only
    "resources": [
        "/api/*",
        "/superset/*",
        "/dashboard/*",
        "/explore/*"
    ],  # Specific resources only
    "origins": [
        "https://your-frontend-domain.com",  # CHANGE TO YOUR PRODUCTION DOMAIN
        "https://*.your-domain.com"          # Allow subdomains if needed
    ]
}

# ============================================================================
# SESSION CONFIGURATION - PRODUCTION
# ============================================================================
SESSION_COOKIE_SAMESITE = "None"  # Required for cross-origin iframes
SESSION_COOKIE_SECURE = True      # IMPORTANT: Must be True with HTTPS
SESSION_COOKIE_HTTPONLY = True    # Prevent JavaScript access to cookies

# ============================================================================
# CSRF CONFIGURATION - PRODUCTION
# ============================================================================
# ENABLE CSRF in production!
WTF_CSRF_ENABLED = True
WTF_CSRF_EXEMPT_LIST = []  # No exemptions in production

# Alternatively, if you need to exempt specific endpoints for API access:
# WTF_CSRF_EXEMPT_LIST = [
#     r"^/api/v1/security/login$",
#     r"^/api/v1/security/guest_token$"
# ]

# ============================================================================
# HTTPS SETTINGS - PRODUCTION
# ============================================================================
# Force HTTPS redirect
ENABLE_PROXY_FIX = True  # If behind reverse proxy (nginx, ALB, etc.)

# ============================================================================
# OTHER SETTINGS
# ============================================================================
PREVENT_UNSAFE_DEFAULT_URLS_ON_DATASET = False

# SECRET KEY - MUST BE SET IN PRODUCTION
# Generate with: openssl rand -base64 42
SECRET_KEY = "CHANGE-THIS-TO-A-STRONG-SECRET-KEY-IN-PRODUCTION"  # MUST CHANGE!

# ============================================================================
# IMPORTANT NOTES FOR PRODUCTION:
# ============================================================================
# 1. Change all "CHANGE-THIS" values to strong, unique secrets
# 2. Update all domain references to your actual production domains
# 3. Ensure your infrastructure supports HTTPS (SSL/TLS certificates)
# 4. Consider using environment variables for secrets:
#    SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY")
#    GUEST_TOKEN_JWT_SECRET = os.getenv("SUPERSET_GUEST_TOKEN_SECRET")
# 5. Use a proper secret manager (AWS Secrets Manager, HashiCorp Vault, etc.)
# 6. Monitor CSP violations and adjust policy as needed
# 7. Test thoroughly in staging environment before production deployment
