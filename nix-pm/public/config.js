// Runtime configuration - will be replaced by environment variables in production
// In development: APIs use proxy (empty string), iframes use production URL directly
window.APP_CONFIG = {
  SUPERSET_URL: '',  // Empty string to use Vite proxy for API calls
  SUPERSET_IFRAME_URL: 'https://nixpm.dashboard.reddie.ai',  // Direct URL for iframes
  API_URL: 'https://localhost:3001'  // HTTPS for local backend
};
