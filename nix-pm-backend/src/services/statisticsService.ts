import { queryDatabase } from '../config/database';
import { mean, median, standardDeviation, min, max } from 'simple-statistics';
import { TimeWindow, AlertStatistics } from '../types/alerts';

interface KPIStatistics {
  min_value: number;
  max_value: number;
  avg_value: number;
  median_value: number;
  stddev_value: number;
  period_start: Date;
  period_end: Date;
  data_points: number;
}

/**
 * Get time window duration in PostgreSQL interval format
 */
function getTimeWindowInterval(timeWindow: TimeWindow): string {
  const intervals: Record<TimeWindow, string> = {
    '15min': '15 minutes',
    '1hour': '1 hour',
    '1day': '1 day',
    '1week': '7 days',
  };
  return intervals[timeWindow];
}

/**
 * Calculate statistics for a KPI over a time period
 */
export async function calculateKPIStatistics(
  kpiName: string,
  datasetName: string,
  timeWindow: TimeWindow = '1day'
): Promise<KPIStatistics> {
  const interval = getTimeWindowInterval(timeWindow);

  // Query to get KPI data from the specified time window
  const query = `
    SELECT
      timestamp,
      "${kpiName}" as value
    FROM ${datasetName}
    WHERE timestamp >= NOW() - INTERVAL '${interval}'
      AND "${kpiName}" IS NOT NULL
    ORDER BY timestamp DESC
  `;

  const rows = await queryDatabase<{ timestamp: Date; value: number }>(query);

  if (rows.length === 0) {
    throw new Error(`No data found for KPI "${kpiName}" in the last ${interval}`);
  }

  const values = rows.map(r => Number(r.value));
  const timestamps = rows.map(r => r.timestamp);

  return {
    min_value: min(values),
    max_value: max(values),
    avg_value: mean(values),
    median_value: median(values),
    stddev_value: standardDeviation(values),
    period_start: new Date(Math.min(...timestamps.map(t => new Date(t).getTime()))),
    period_end: new Date(Math.max(...timestamps.map(t => new Date(t).getTime()))),
    data_points: values.length,
  };
}

/**
 * Get current KPI value (most recent data point)
 */
export async function getCurrentKPIValue(
  kpiName: string,
  datasetName: string
): Promise<number> {
  const query = `
    SELECT "${kpiName}" as value
    FROM ${datasetName}
    WHERE "${kpiName}" IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  const rows = await queryDatabase<{ value: number }>(query);

  if (rows.length === 0) {
    throw new Error(`No data found for KPI "${kpiName}"`);
  }

  return Number(rows[0].value);
}

/**
 * Get aggregated KPI value over time window
 */
export async function getAggregatedKPIValue(
  kpiName: string,
  datasetName: string,
  timeWindow: TimeWindow,
  aggregation: 'avg' | 'sum' | 'max' | 'min'
): Promise<number> {
  const interval = getTimeWindowInterval(timeWindow);

  const aggFunction = aggregation.toUpperCase();

  const query = `
    SELECT ${aggFunction}("${kpiName}") as value
    FROM ${datasetName}
    WHERE timestamp >= NOW() - INTERVAL '${interval}'
      AND "${kpiName}" IS NOT NULL
  `;

  const rows = await queryDatabase<{ value: number }>(query);

  if (rows.length === 0 || rows[0].value === null) {
    throw new Error(`No data found for KPI "${kpiName}" in the last ${interval}`);
  }

  return Number(rows[0].value);
}

/**
 * Save alert statistics to database
 */
export async function saveAlertStatistics(
  alertId: number,
  stats: KPIStatistics
): Promise<void> {
  const query = `
    INSERT INTO alert_statistics (
      alert_id,
      min_value,
      max_value,
      avg_value,
      median_value,
      stddev_value,
      period_start,
      period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

  await queryDatabase(query, [
    alertId,
    stats.min_value,
    stats.max_value,
    stats.avg_value,
    stats.median_value,
    stats.stddev_value,
    stats.period_start,
    stats.period_end,
  ]);
}

/**
 * Get latest statistics for an alert
 */
export async function getAlertStatistics(
  alertId: number
): Promise<AlertStatistics | null> {
  const query = `
    SELECT *
    FROM alert_statistics
    WHERE alert_id = $1
    ORDER BY calculated_at DESC
    LIMIT 1
  `;

  const rows = await queryDatabase<AlertStatistics>(query, [alertId]);
  return rows.length > 0 ? rows[0] : null;
}
