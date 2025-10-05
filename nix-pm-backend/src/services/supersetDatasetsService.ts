import { queryDatabase } from '../config/database';

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

export async function getAllDatasets(): Promise<SupersetDataset[]> {
  const query = `
    SELECT
      id,
      dataset_name,
      postgres_table,
      geographic_level,
      time_aggregation,
      kpis,
      is_active,
      created_at,
      updated_at
    FROM superset_datasets
    ORDER BY geographic_level, time_aggregation
  `;

  const rows = await queryDatabase<SupersetDataset>(query);
  return rows;
}

export async function getDatasetById(id: number): Promise<SupersetDataset | null> {
  const query = `
    SELECT
      id,
      dataset_name,
      postgres_table,
      geographic_level,
      time_aggregation,
      kpis,
      is_active,
      created_at,
      updated_at
    FROM superset_datasets
    WHERE id = $1
  `;

  const rows = await queryDatabase<SupersetDataset>(query, [id]);
  return rows.length > 0 ? rows[0] : null;
}

export async function createDataset(dataset: Omit<SupersetDataset, 'id' | 'created_at' | 'updated_at'>): Promise<SupersetDataset> {
  const query = `
    INSERT INTO superset_datasets (
      dataset_name,
      postgres_table,
      geographic_level,
      time_aggregation,
      kpis,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const rows = await queryDatabase<SupersetDataset>(query, [
    dataset.dataset_name,
    dataset.postgres_table,
    dataset.geographic_level,
    dataset.time_aggregation,
    JSON.stringify(dataset.kpis),
    dataset.is_active,
  ]);

  return rows[0];
}

export async function updateDataset(id: number, dataset: Partial<SupersetDataset>): Promise<SupersetDataset | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (dataset.dataset_name !== undefined) {
    fields.push(`dataset_name = $${paramIndex++}`);
    values.push(dataset.dataset_name);
  }

  if (dataset.postgres_table !== undefined) {
    fields.push(`postgres_table = $${paramIndex++}`);
    values.push(dataset.postgres_table);
  }

  if (dataset.geographic_level !== undefined) {
    fields.push(`geographic_level = $${paramIndex++}`);
    values.push(dataset.geographic_level);
  }

  if (dataset.time_aggregation !== undefined) {
    fields.push(`time_aggregation = $${paramIndex++}`);
    values.push(dataset.time_aggregation);
  }

  if (dataset.kpis !== undefined) {
    fields.push(`kpis = $${paramIndex++}`);
    values.push(JSON.stringify(dataset.kpis));
  }

  if (dataset.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(dataset.is_active);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);

  const query = `
    UPDATE superset_datasets
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const rows = await queryDatabase<SupersetDataset>(query, values);
  return rows.length > 0 ? rows[0] : null;
}

export async function deleteDataset(id: number): Promise<boolean> {
  const query = `DELETE FROM superset_datasets WHERE id = $1`;
  await queryDatabase(query, [id]);
  return true;
}

export async function getActiveDatasets(): Promise<SupersetDataset[]> {
  const query = `
    SELECT
      id,
      dataset_name,
      postgres_table,
      geographic_level,
      time_aggregation,
      kpis,
      is_active,
      created_at,
      updated_at
    FROM superset_datasets
    WHERE is_active = true
    ORDER BY geographic_level, time_aggregation
  `;

  const rows = await queryDatabase<SupersetDataset>(query);
  return rows;
}

export async function getDatasetsByLevel(
  geographic_level?: string,
  time_aggregation?: string
): Promise<SupersetDataset[]> {
  let query = `
    SELECT
      id,
      dataset_name,
      postgres_table,
      geographic_level,
      time_aggregation,
      kpis,
      is_active,
      created_at,
      updated_at
    FROM superset_datasets
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (geographic_level) {
    query += ` AND geographic_level = $${paramIndex++}`;
    params.push(geographic_level);
  }

  if (time_aggregation) {
    query += ` AND time_aggregation = $${paramIndex++}`;
    params.push(time_aggregation);
  }

  query += ` ORDER BY geographic_level, time_aggregation`;

  const rows = await queryDatabase<SupersetDataset>(query, params);
  return rows;
}
