export type AlertType = 'threshold' | 'anomaly';
export type ComparisonOperator = 'greater_than' | 'less_than' | 'between';
export type AggregationMethod = 'avg' | 'sum' | 'max' | 'min';
export type TimeWindow = '15min' | '1hour' | '1day' | '1week';
export type CheckFrequency = '5min' | '15min' | '30min' | '1hour' | '6hour' | '12hour' | '1day';

export interface ThresholdConfig {
  metric: string;
  threshold_upper?: number;
  threshold_lower?: number;
  comparison: ComparisonOperator;
  time_window: TimeWindow;
  aggregation: AggregationMethod;
}

export interface Alert {
  id: number;
  name: string;
  description?: string;
  kpi_name: string;
  dataset_name: string;
  alert_type: AlertType;
  enabled: boolean;
  check_frequency: CheckFrequency;
  last_checked_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  config: ThresholdConfig;
}

export interface CreateAlertDto {
  name: string;
  description?: string;
  kpi_name: string;
  dataset_name: string;
  alert_type: AlertType;
  enabled: boolean;
  check_frequency: CheckFrequency;
  config: ThresholdConfig;
  created_by?: string;
}

export interface AlertTrigger {
  id: number;
  alert_id: number;
  alert_name?: string;
  kpi_name?: string;
  dataset_name?: string;
  triggered_at: string;
  value: number;
  expected_value?: number;
  anomaly_score?: number;
  metadata?: any;
  resolved: boolean;
  resolved_at?: string;
}

export interface AlertStatistics {
  id: number;
  alert_id: number;
  calculated_at: string;
  min_value: number;
  max_value: number;
  avg_value: number;
  median_value: number;
  stddev_value?: number;
  period_start: string;
  period_end: string;
  data_points?: number;
}

export interface KPIStatistics {
  min_value: number;
  max_value: number;
  avg_value: number;
  median_value: number;
  stddev_value: number;
  period_start: string;
  period_end: string;
  data_points: number;
}

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  '15min': '15 Minutes',
  '1hour': '1 Hour',
  '1day': '1 Day',
  '1week': '1 Week',
};

export const CHECK_FREQUENCY_LABELS: Record<CheckFrequency, string> = {
  '5min': 'Every 5 Minutes',
  '15min': 'Every 15 Minutes',
  '30min': 'Every 30 Minutes',
  '1hour': 'Every Hour',
  '6hour': 'Every 6 Hours',
  '12hour': 'Every 12 Hours',
  '1day': 'Daily',
};

export const AGGREGATION_LABELS: Record<AggregationMethod, string> = {
  'avg': 'Average',
  'sum': 'Sum',
  'max': 'Maximum',
  'min': 'Minimum',
};

export const COMPARISON_LABELS: Record<ComparisonOperator, string> = {
  'greater_than': 'Greater Than',
  'less_than': 'Less Than',
  'between': 'Between Range',
};
