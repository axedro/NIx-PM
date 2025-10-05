-- Migration: Create superset_datasets table
-- Description: Stores configuration for Superset datasets with geographic and time aggregation levels

CREATE TABLE IF NOT EXISTS superset_datasets (
    id SERIAL PRIMARY KEY,
    dataset_name VARCHAR(255) NOT NULL UNIQUE,
    postgres_table VARCHAR(255) NOT NULL,
    geographic_level VARCHAR(50) NOT NULL,
    time_aggregation VARCHAR(50) NOT NULL,
    kpis JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_geographic_level CHECK (geographic_level IN ('global', 'provincia', 'region', 'zipcode', 'celda', 'nodo')),
    CONSTRAINT valid_time_aggregation CHECK (time_aggregation IN ('15m', '1h', '1d', '1w', '1m'))
);

-- Create index for faster queries
CREATE INDEX idx_superset_datasets_geographic ON superset_datasets(geographic_level);
CREATE INDEX idx_superset_datasets_time ON superset_datasets(time_aggregation);
CREATE INDEX idx_superset_datasets_active ON superset_datasets(is_active);

-- Insert default datasets based on existing structure
INSERT INTO superset_datasets (dataset_name, postgres_table, geographic_level, time_aggregation, kpis) VALUES
    ('Global 15min KPIs', 'kpi_global_15min', 'global', '15m', '[]'),
    ('Provincia 15min KPIs', 'kpi_provincia_15min', 'provincia', '15m', '[]'),
    ('Region 15min KPIs', 'kpi_region_15min', 'region', '15m', '[]'),
    ('Zipcode 15min KPIs', 'kpi_zipcode_15min', 'zipcode', '15m', '[]'),
    ('Celda 15min KPIs', 'kpi_celda_15min', 'celda', '15m', '[]'),
    ('Nodo 15min KPIs', 'kpi_nodo_15min', 'nodo', '15m', '[]')
ON CONFLICT (dataset_name) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_superset_datasets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_superset_datasets_updated_at
    BEFORE UPDATE ON superset_datasets
    FOR EACH ROW
    EXECUTE FUNCTION update_superset_datasets_updated_at();
