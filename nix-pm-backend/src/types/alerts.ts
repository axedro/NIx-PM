import { z } from 'zod';

// Alert types
export type AlertType = 'threshold' | 'anomaly';
export type ComparisonOperator = 'greater_than' | 'less_than' | 'between';
export type AggregationMethod = 'avg' | 'sum' | 'max' | 'min';
export type TimeWindow = '15min' | '1hour' | '1day' | '1week';
export type CheckFrequency = '5min' | '15min' | '30min' | '1hour' | '6hour' | '12hour' | '1day';

// Threshold alert configuration schema
export const ThresholdConfigSchema = z.object({
  metric: z.string(), // e.g., "dl_pdcp_sdu_traffic_all_qci"
  threshold_upper: z.number().optional(),
  threshold_lower: z.number().optional(),
  comparison: z.enum(['greater_than', 'less_than', 'between']),
  time_window: z.enum(['15min', '1hour', '1day', '1week']),
  aggregation: z.enum(['avg', 'sum', 'max', 'min']),
});

export type ThresholdConfig = z.infer<typeof ThresholdConfigSchema>;

// Alert schema
export const CreateAlertSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  kpi_name: z.string().min(1),
  dataset_name: z.string().min(1),
  alert_type: z.enum(['threshold', 'anomaly']),
  enabled: z.boolean().default(true),
  check_frequency: z.enum(['5min', '15min', '30min', '1hour', '6hour', '12hour', '1day']).default('5min'),
  config: z.union([ThresholdConfigSchema, z.object({})]),
  created_by: z.string().optional(),
});

export type CreateAlertDto = z.infer<typeof CreateAlertSchema>;

// Database models
export interface Alert {
  id: number;
  name: string;
  description?: string;
  kpi_name: string;
  dataset_name: string;
  alert_type: AlertType;
  enabled: boolean;
  check_frequency: CheckFrequency;
  last_checked_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  config: ThresholdConfig;
}

export interface AlertTrigger {
  id: number;
  alert_id: number;
  triggered_at: Date;
  value: number;
  expected_value?: number;
  anomaly_score?: number;
  metadata?: any;
  resolved: boolean;
  resolved_at?: Date;
}

export interface AlertStatistics {
  id: number;
  alert_id: number;
  calculated_at: Date;
  min_value: number;
  max_value: number;
  avg_value: number;
  median_value: number;
  stddev_value?: number;
  period_start: Date;
  period_end: Date;
}

// KPI data from kpi_global_15min table
export interface KPIDataPoint {
  timestamp: Date;
  [kpiName: string]: any; // Dynamic KPI columns
}
