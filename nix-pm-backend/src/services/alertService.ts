import { queryDatabase } from '../config/database';
import { Alert, CreateAlertDto } from '../types/alerts';

/**
 * Get all alerts with optional filtering
 */
export async function getAlerts(params?: {
  enabled?: boolean;
  kpi_name?: string;
  alert_type?: string;
}): Promise<Alert[]> {
  let query = 'SELECT * FROM alerts WHERE 1=1';
  const queryParams: any[] = [];
  let paramCount = 1;

  if (params?.enabled !== undefined) {
    query += ` AND enabled = $${paramCount}`;
    queryParams.push(params.enabled);
    paramCount++;
  }

  if (params?.kpi_name) {
    query += ` AND kpi_name = $${paramCount}`;
    queryParams.push(params.kpi_name);
    paramCount++;
  }

  if (params?.alert_type) {
    query += ` AND alert_type = $${paramCount}`;
    queryParams.push(params.alert_type);
    paramCount++;
  }

  query += ' ORDER BY created_at DESC';

  return await queryDatabase<Alert>(query, queryParams);
}

/**
 * Get a single alert by ID
 */
export async function getAlertById(id: number): Promise<Alert | null> {
  const query = 'SELECT * FROM alerts WHERE id = $1';
  const rows = await queryDatabase<Alert>(query, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Create a new alert
 */
export async function createAlert(data: CreateAlertDto): Promise<Alert> {
  const query = `
    INSERT INTO alerts (
      name,
      description,
      kpi_name,
      dataset_name,
      alert_type,
      enabled,
      config,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const rows = await queryDatabase<Alert>(query, [
    data.name,
    data.description || null,
    data.kpi_name,
    data.dataset_name,
    data.alert_type,
    data.enabled,
    JSON.stringify(data.config),
    data.created_by || null,
  ]);

  console.log(`✓ Alert created: ${data.name} (ID: ${rows[0].id})`);
  return rows[0];
}

/**
 * Update an existing alert
 */
export async function updateAlert(
  id: number,
  data: Partial<CreateAlertDto>
): Promise<Alert> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(data.description);
  }

  if (data.kpi_name !== undefined) {
    updates.push(`kpi_name = $${paramCount++}`);
    values.push(data.kpi_name);
  }

  if (data.dataset_name !== undefined) {
    updates.push(`dataset_name = $${paramCount++}`);
    values.push(data.dataset_name);
  }

  if (data.enabled !== undefined) {
    updates.push(`enabled = $${paramCount++}`);
    values.push(data.enabled);
  }

  if (data.config !== undefined) {
    updates.push(`config = $${paramCount++}`);
    values.push(JSON.stringify(data.config));
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE alerts
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const rows = await queryDatabase<Alert>(query, values);

  if (rows.length === 0) {
    throw new Error(`Alert with ID ${id} not found`);
  }

  console.log(`✓ Alert updated: ${rows[0].name} (ID: ${id})`);
  return rows[0];
}

/**
 * Delete an alert
 */
export async function deleteAlert(id: number): Promise<void> {
  const query = 'DELETE FROM alerts WHERE id = $1';
  await queryDatabase(query, [id]);
  console.log(`✓ Alert deleted (ID: ${id})`);
}

/**
 * Enable/disable an alert
 */
export async function setAlertEnabled(id: number, enabled: boolean): Promise<Alert> {
  return await updateAlert(id, { enabled });
}

/**
 * Get all active (enabled) alerts
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  return await getAlerts({ enabled: true });
}
