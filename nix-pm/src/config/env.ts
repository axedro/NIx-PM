// Runtime configuration - reads from window.APP_CONFIG injected by docker-entrypoint.sh
// Falls back to environment variables for development

interface AppConfig {
  SUPERSET_URL: string;
  API_URL: string;
}

// Default configuration for development
const defaultConfig: AppConfig = {
  SUPERSET_URL: import.meta.env.VITE_SUPERSET_URL || 'http://localhost:8088',
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
};

// Runtime config from window.APP_CONFIG (injected in production)
declare global {
  interface Window {
    APP_CONFIG?: AppConfig;
  }
}

// Export configuration - prefers runtime config, falls back to build-time config
export const config: AppConfig = {
  SUPERSET_URL: window.APP_CONFIG?.SUPERSET_URL || defaultConfig.SUPERSET_URL,
  API_URL: window.APP_CONFIG?.API_URL || defaultConfig.API_URL
};

export default config;
