import { pool, queryDatabase } from '../config/database';

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    // Create alerts table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        kpi_name VARCHAR(255) NOT NULL,
        dataset_name VARCHAR(255) NOT NULL,
        alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('threshold', 'anomaly')),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        config JSONB NOT NULL
      )
    `);
    console.log('✓ Created alerts table');

    // Create alert_triggers table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS alert_triggers (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        value DECIMAL,
        expected_value DECIMAL,
        anomaly_score DECIMAL,
        metadata JSONB,
        resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP
      )
    `);
    console.log('✓ Created alert_triggers table');

    // Create alert_statistics table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS alert_statistics (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        min_value DECIMAL,
        max_value DECIMAL,
        avg_value DECIMAL,
        median_value DECIMAL,
        stddev_value DECIMAL,
        period_start TIMESTAMP,
        period_end TIMESTAMP
      )
    `);
    console.log('✓ Created alert_statistics table');

    // Create indexes for performance
    await queryDatabase(`
      CREATE INDEX IF NOT EXISTS idx_alerts_kpi_name ON alerts(kpi_name);
    `);
    await queryDatabase(`
      CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(enabled);
    `);
    await queryDatabase(`
      CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert_id ON alert_triggers(alert_id);
    `);
    await queryDatabase(`
      CREATE INDEX IF NOT EXISTS idx_alert_triggers_triggered_at ON alert_triggers(triggered_at);
    `);
    console.log('✓ Created indexes');

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
