import axios from 'axios';

const API_BASE = '/api/superset-datasets';

export interface SupersetDataset {
  id?: number;
  dataset_name: string;
  postgres_table: string;
  geographic_level: 'global' | 'provincia' | 'region' | 'zipcode' | 'celda' | 'nodo';
  time_aggregation: '15m' | '1h' | '1d' | '1w' | '1m';
  kpis: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface KPI {
  name: string;
  description: string;
  category: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SupersetDatasetsService {
  async getAllDatasets(params?: {
    geographic_level?: string;
    time_aggregation?: string;
    active_only?: boolean;
  }): Promise<SupersetDataset[]> {
    const response = await axios.get<ApiResponse<SupersetDataset[]>>(API_BASE, { params });
    if (!response.data.data) {
      throw new Error('Failed to fetch datasets');
    }
    return response.data.data;
  }

  async getDatasetById(id: number): Promise<SupersetDataset> {
    const response = await axios.get<ApiResponse<SupersetDataset>>(`${API_BASE}/${id}`);
    if (!response.data.data) {
      throw new Error('Dataset not found');
    }
    return response.data.data;
  }

  async createDataset(dataset: Omit<SupersetDataset, 'id' | 'created_at' | 'updated_at'>): Promise<SupersetDataset> {
    const response = await axios.post<ApiResponse<SupersetDataset>>(API_BASE, dataset);
    if (!response.data.data) {
      throw new Error('Failed to create dataset');
    }
    return response.data.data;
  }

  async updateDataset(id: number, dataset: Partial<SupersetDataset>): Promise<SupersetDataset> {
    const response = await axios.put<ApiResponse<SupersetDataset>>(`${API_BASE}/${id}`, dataset);
    if (!response.data.data) {
      throw new Error('Failed to update dataset');
    }
    return response.data.data;
  }

  async deleteDataset(id: number): Promise<void> {
    await axios.delete(`${API_BASE}/${id}`);
  }

  async getAvailableKPIs(): Promise<KPI[]> {
    const response = await axios.get<ApiResponse<KPI[]>>(`${API_BASE}/meta/kpis`);
    if (!response.data.data) {
      throw new Error('Failed to fetch available KPIs');
    }
    return response.data.data;
  }

  async getAvailableTables(): Promise<string[]> {
    const response = await axios.get<ApiResponse<string[]>>(`${API_BASE}/meta/tables`);
    if (!response.data.data) {
      throw new Error('Failed to fetch available tables');
    }
    return response.data.data;
  }

  async getTableColumns(tableName: string): Promise<Array<{ name: string; type: string }>> {
    const response = await axios.get<ApiResponse<Array<{ name: string; type: string }>>>(
      `${API_BASE}/meta/tables/${tableName}/columns`
    );
    if (!response.data.data) {
      throw new Error('Failed to fetch table columns');
    }
    return response.data.data;
  }
}

const supersetDatasetsService = new SupersetDatasetsService();
export default supersetDatasetsService;
