import axios from 'axios';
import type { Alert, CreateAlertDto, AlertTrigger, AlertStatistics, KPIStatistics } from '../types/alerts';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class AlertsService {
  // Alert Management
  async getAlerts(params?: {
    enabled?: boolean;
    kpi_name?: string;
    alert_type?: string;
  }): Promise<Alert[]> {
    const response = await axios.get<ApiResponse<Alert[]>>(`${API_BASE}/alerts`, { params });
    return response.data.data || [];
  }

  async getAlertById(id: number): Promise<Alert> {
    const response = await axios.get<ApiResponse<Alert>>(`${API_BASE}/alerts/${id}`);
    if (!response.data.data) {
      throw new Error('Alert not found');
    }
    return response.data.data;
  }

  async createAlert(data: CreateAlertDto): Promise<Alert> {
    const response = await axios.post<ApiResponse<Alert>>(`${API_BASE}/alerts`, data);
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to create alert');
    }
    return response.data.data;
  }

  async updateAlert(id: number, data: Partial<CreateAlertDto>): Promise<Alert> {
    const response = await axios.put<ApiResponse<Alert>>(`${API_BASE}/alerts/${id}`, data);
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to update alert');
    }
    return response.data.data;
  }

  async deleteAlert(id: number): Promise<void> {
    await axios.delete(`${API_BASE}/alerts/${id}`);
  }

  async enableAlert(id: number): Promise<Alert> {
    const response = await axios.put<ApiResponse<Alert>>(`${API_BASE}/alerts/${id}/enable`);
    if (!response.data.data) {
      throw new Error('Failed to enable alert');
    }
    return response.data.data;
  }

  async disableAlert(id: number): Promise<Alert> {
    const response = await axios.put<ApiResponse<Alert>>(`${API_BASE}/alerts/${id}/disable`);
    if (!response.data.data) {
      throw new Error('Failed to disable alert');
    }
    return response.data.data;
  }

  async testAlert(id: number): Promise<{
    would_trigger: boolean;
    current_value: number;
    reason?: string;
    threshold?: number;
  }> {
    const response = await axios.post<ApiResponse<any>>(`${API_BASE}/alerts/${id}/test`);
    return response.data.data;
  }

  async getAlertStatistics(id: number): Promise<AlertStatistics> {
    const response = await axios.get<ApiResponse<AlertStatistics>>(`${API_BASE}/alerts/${id}/statistics`);
    if (!response.data.data) {
      throw new Error('Failed to get statistics');
    }
    return response.data.data;
  }

  // Triggers
  async getAllTriggers(limit: number = 100): Promise<AlertTrigger[]> {
    const response = await axios.get<ApiResponse<AlertTrigger[]>>(`${API_BASE}/triggers`, {
      params: { limit },
    });
    return response.data.data || [];
  }

  async getAlertTriggers(alertId: number, limit: number = 50): Promise<AlertTrigger[]> {
    const response = await axios.get<ApiResponse<AlertTrigger[]>>(
      `${API_BASE}/triggers/alert/${alertId}`,
      { params: { limit } }
    );
    return response.data.data || [];
  }

  async resolveTrigger(id: number): Promise<void> {
    await axios.put(`${API_BASE}/triggers/${id}/resolve`);
  }

  // Statistics
  async calculateStatistics(
    kpiName: string,
    datasetName: string,
    timeWindow: string = '1day'
  ): Promise<KPIStatistics> {
    const response = await axios.post<ApiResponse<KPIStatistics>>(
      `${API_BASE}/statistics/calculate`,
      {
        kpi_name: kpiName,
        dataset_name: datasetName,
        time_window: timeWindow,
      }
    );
    if (!response.data.data) {
      throw new Error('Failed to calculate statistics');
    }
    return response.data.data;
  }

  async getKPITimeseries(
    kpiName: string,
    datasetName: string,
    limit: number = 100
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const response = await axios.post<ApiResponse<Array<{ timestamp: Date; value: number }>>>(
      `${API_BASE}/statistics/timeseries`,
      {
        kpi_name: kpiName,
        dataset_name: datasetName,
        limit,
      }
    );
    if (!response.data.data) {
      throw new Error('Failed to fetch timeseries data');
    }
    return response.data.data;
  }
}

export const alertsService = new AlertsService();
