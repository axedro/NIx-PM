import axios from 'axios';

// Use proxy in development, direct URL in production
const SUPERSET_URL = import.meta.env.DEV ? '' : 'http://localhost:8088';

export interface SupersetCredentials {
  username: string;
  password: string;
}

export interface GuestToken {
  token: string;
}

class SupersetService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private credentials: SupersetCredentials | null = null;

  async login(credentials: SupersetCredentials): Promise<void> {
    try {
      const response = await axios.post(`${SUPERSET_URL}/api/v1/security/login`, {
        username: credentials.username,
        password: credentials.password,
        provider: 'db',
        refresh: true,
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.credentials = credentials; // Store credentials for session linking

      // Store credentials in sessionStorage for persistence
      sessionStorage.setItem('superset_credentials', JSON.stringify(credentials));
      sessionStorage.setItem('superset_access_token', this.accessToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
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

  getCredentials(): SupersetCredentials | null {
    return this.credentials;
  }

  async getGuestToken(resources: { type: string; id: string }[]): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log('Requesting guest token for resources:', resources);
      console.log('Using access token:', this.accessToken.substring(0, 20) + '...');

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

      console.log('Guest token response:', response.data);
      return response.data.token;
    } catch (error: any) {
      console.error('Failed to get guest token:', error);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error status:', error.response?.status);
      console.error('Full error:', JSON.stringify(error.response, null, 2));
      throw error;
    }
  }

  async getDashboards(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(`${SUPERSET_URL}/api/v1/dashboard/`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
      throw error;
    }
  }

  async getCharts(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(`${SUPERSET_URL}/api/v1/chart/`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch charts:', error);
      throw error;
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
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
