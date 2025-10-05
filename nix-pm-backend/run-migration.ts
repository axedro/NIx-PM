import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './src/config/database';

async function runMigration() {
  try {
    const migrationPath = join(__dirname, 'migrations', '004_create_superset_datasets.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Running migration: 004_create_superset_datasets.sql');
    await pool.query(sql);
    console.log('Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
