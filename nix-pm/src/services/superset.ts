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

        // Check if there are more pages
        hasMore = results.length === pageSize;
        page++;

        console.log(`Fetched page ${page}, got ${results.length} dashboards, total: ${allDashboards.length}`);
      }

      console.log(`Total dashboards fetched: ${allDashboards.length}`);
      return allDashboards;
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

        // Check if there are more pages
        hasMore = results.length === pageSize;
        page++;

        console.log(`Fetched page ${page}, got ${results.length} charts, total: ${allCharts.length}`);
      }

      console.log(`Total charts fetched: ${allCharts.length}`);
      return allCharts;
    } catch (error) {
      console.error('Failed to fetch charts:', error);
      throw error;
    }
  }

  async getDatasets(): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      // Add pagination params to get all datasets
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

      console.log('Datasets response:', response.data);
      return response.data.result || [];
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
      throw error;
    }
  }

  async getDatasetDetails(datasetId: number): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(`${SUPERSET_URL}/api/v1/dataset/${datasetId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      console.log('Dataset details response:', response.data);
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch dataset details:', error);
      throw error;
    }
  }

  async createChart(chartData: {
    slice_name: string;
    viz_type: string;
    datasource_id: number;
    datasource_type: string;
    params?: string;
  }): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
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
    } catch (error) {
      console.error('Failed to create chart:', error);
      throw error;
    }
  }

  async deleteChart(chartId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      await axios.delete(`${SUPERSET_URL}/api/v1/chart/${chartId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (error) {
      console.error('Failed to delete chart:', error);
      throw error;
    }
  }

  async exportChart(chartId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(
        `${SUPERSET_URL}/api/v1/chart/export/?q=![${chartId}]`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chart_${chartId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export chart:', error);
      throw error;
    }
  }

  async deleteDashboard(dashboardId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      await axios.delete(`${SUPERSET_URL}/api/v1/dashboard/${dashboardId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      throw error;
    }
  }

  async exportDashboard(dashboardId: number): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(
        `${SUPERSET_URL}/api/v1/dashboard/export/?q=![${dashboardId}]`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_${dashboardId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export dashboard:', error);
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
