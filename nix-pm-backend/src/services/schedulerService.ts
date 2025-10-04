import cron from 'node-cron';
import { getActiveAlerts } from './alertService';
import { evaluateThresholdAlert, createAlertTrigger } from './thresholdService';
import { Alert } from '../types/alerts';

let schedulerTask: cron.ScheduledTask | null = null;

/**
 * Check if alert should be evaluated based on its check_frequency
 */
function shouldCheckAlert(alert: Alert): boolean {
  if (!alert.last_checked_at) return true;

  const frequencyMinutes: Record<string, number> = {
    '5min': 5,
    '15min': 15,
    '30min': 30,
    '1hour': 60,
    '6hour': 360,
    '12hour': 720,
    '1day': 1440,
  };

  const minutes = frequencyMinutes[alert.check_frequency] || 5;
  const lastCheck = new Date(alert.last_checked_at).getTime();
  const now = Date.now();
  const elapsed = (now - lastCheck) / 1000 / 60; // minutes

  return elapsed >= minutes;
}

/**
 * Update last_checked_at timestamp for alert
 */
async function updateLastChecked(alertId: number): Promise<void> {
  const { queryDatabase } = await import('../config/database');
  await queryDatabase('UPDATE alerts SET last_checked_at = NOW() WHERE id = $1', [alertId]);
}

/**
 * Evaluate a single alert
 */
async function evaluateAlert(alert: Alert): Promise<void> {
  try {
    // Check if enough time has passed since last check
    if (!shouldCheckAlert(alert)) {
      console.log(`⏭ Skipping alert ${alert.name} (checked recently, frequency: ${alert.check_frequency})`);
      return;
    }

    console.log(`Evaluating alert: ${alert.name} (ID: ${alert.id}, frequency: ${alert.check_frequency})`);

    if (alert.alert_type === 'threshold') {
      const result = await evaluateThresholdAlert(alert);

      // Update last checked timestamp
      await updateLastChecked(alert.id);

      if (result.triggered) {
        console.log(`🚨 ALERT TRIGGERED: ${alert.name}`);
        console.log(`   Reason: ${result.reason}`);

        // Create trigger record
        await createAlertTrigger(alert.id, result.value, {
          reason: result.reason,
          threshold: result.threshold,
          config: alert.config,
        });

        // TODO: Send notifications (email, Slack, etc.)
      } else {
        console.log(`✓ Alert OK: ${alert.name} (value: ${result.value})`);
      }
    } else if (alert.alert_type === 'anomaly') {
      // TODO: Implement anomaly detection in future phase
      console.log(`⏭ Skipping anomaly alert: ${alert.name} (not implemented yet)`);
    }
  } catch (error) {
    console.error(`❌ Error evaluating alert ${alert.id}:`, error);
  }
}

/**
 * Check all active alerts
 */
async function checkAllAlerts(): Promise<void> {
  const startTime = Date.now();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔍 Starting alert check cycle at ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const activeAlerts = await getActiveAlerts();
    console.log(`Found ${activeAlerts.length} active alert(s)\n`);

    if (activeAlerts.length === 0) {
      console.log('No active alerts to check');
      return;
    }

    for (const alert of activeAlerts) {
      await evaluateAlert(alert);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Alert check cycle completed in ${duration}ms`);
  } catch (error) {
    console.error('❌ Error during alert check cycle:', error);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Start the alert scheduler
 */
export function startAlertScheduler(cronExpression: string = '*/5 * * * *'): void {
  if (schedulerTask) {
    console.log('⚠️  Alert scheduler is already running');
    return;
  }

  console.log(`\n🚀 Starting alert scheduler with cron expression: ${cronExpression}`);
  console.log(`   Next check will run in approximately 5 minutes\n`);

  schedulerTask = cron.schedule(cronExpression, () => {
    checkAllAlerts();
  });

  // Run an initial check immediately
  setTimeout(() => {
    console.log('Running initial alert check...\n');
    checkAllAlerts();
  }, 5000); // Wait 5 seconds for server to fully start
}

/**
 * Stop the alert scheduler
 */
export function stopAlertScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('Alert scheduler stopped');
  }
}

/**
 * Run a manual alert check (for testing)
 */
export async function runManualAlertCheck(): Promise<void> {
  await checkAllAlerts();
}
