import { Alert, ThresholdConfig, AlertTrigger } from '../types/alerts';
import { getAggregatedKPIValue } from './statisticsService';
import { queryDatabase } from '../config/database';

interface ThresholdEvaluationResult {
  triggered: boolean;
  value: number;
  reason?: string;
  threshold?: number;
}

/**
 * Evaluate a threshold alert
 */
export async function evaluateThresholdAlert(
  alert: Alert
): Promise<ThresholdEvaluationResult> {
  const config = alert.config as ThresholdConfig;

  try {
    // Get aggregated value for the configured time window
    const value = await getAggregatedKPIValue(
      alert.kpi_name,
      alert.dataset_name,
      config.time_window,
      config.aggregation
    );

    console.log(`Alert ${alert.id} - ${alert.name}: Current value = ${value}`);

    // Check against thresholds based on comparison type
    switch (config.comparison) {
      case 'greater_than':
        if (config.threshold_upper !== undefined && value > config.threshold_upper) {
          return {
            triggered: true,
            value,
            reason: `Value ${value} exceeded upper threshold ${config.threshold_upper}`,
            threshold: config.threshold_upper,
          };
        }
        break;

      case 'less_than':
        if (config.threshold_lower !== undefined && value < config.threshold_lower) {
          return {
            triggered: true,
            value,
            reason: `Value ${value} fell below lower threshold ${config.threshold_lower}`,
            threshold: config.threshold_lower,
          };
        }
        break;

      case 'between':
        if (config.threshold_upper !== undefined && value > config.threshold_upper) {
          return {
            triggered: true,
            value,
            reason: `Value ${value} exceeded upper threshold ${config.threshold_upper}`,
            threshold: config.threshold_upper,
          };
        }
        if (config.threshold_lower !== undefined && value < config.threshold_lower) {
          return {
            triggered: true,
            value,
            reason: `Value ${value} fell below lower threshold ${config.threshold_lower}`,
            threshold: config.threshold_lower,
          };
        }
        break;
    }

    return { triggered: false, value };
  } catch (error) {
    console.error(`Error evaluating threshold alert ${alert.id}:`, error);
    throw error;
  }
}

/**
 * Create alert trigger record
 */
export async function createAlertTrigger(
  alertId: number,
  value: number,
  metadata?: any
): Promise<AlertTrigger> {
  const query = `
    INSERT INTO alert_triggers (
      alert_id,
      value,
      metadata
    ) VALUES ($1, $2, $3)
    RETURNING *
  `;

  const rows = await queryDatabase<AlertTrigger>(query, [
    alertId,
    value,
    JSON.stringify(metadata || {}),
  ]);

  console.log(`✓ Alert trigger created for alert ${alertId}`);
  return rows[0];
}

/**
 * Get recent triggers for an alert
 */
export async function getAlertTriggers(
  alertId: number,
  limit: number = 50
): Promise<AlertTrigger[]> {
  const query = `
    SELECT *
    FROM alert_triggers
    WHERE alert_id = $1
    ORDER BY triggered_at DESC
    LIMIT $2
  `;

  return await queryDatabase<AlertTrigger>(query, [alertId, limit]);
}

/**
 * Get all recent triggers across all alerts
 */
export async function getAllRecentTriggers(limit: number = 100): Promise<AlertTrigger[]> {
  const query = `
    SELECT
      t.*,
      a.name as alert_name,
      a.kpi_name,
      a.dataset_name
    FROM alert_triggers t
    JOIN alerts a ON t.alert_id = a.id
    ORDER BY t.triggered_at DESC
    LIMIT $1
  `;

  return await queryDatabase<AlertTrigger>(query, [limit]);
}

/**
 * Mark trigger as resolved
 */
export async function resolveAlertTrigger(triggerId: number): Promise<void> {
  const query = `
    UPDATE alert_triggers
    SET resolved = true, resolved_at = NOW()
    WHERE id = $1
  `;

  await queryDatabase(query, [triggerId]);
  console.log(`✓ Alert trigger ${triggerId} marked as resolved`);
}
