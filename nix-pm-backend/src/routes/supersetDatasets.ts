import { Router, Request, Response } from 'express';
import {
  getAllDatasets,
  getDatasetById,
  createDataset,
  updateDataset,
  deleteDataset,
  getActiveDatasets,
  getDatasetsByLevel,
} from '../services/supersetDatasetsService';

const router = Router();

// Get all datasets
router.get('/', async (req: Request, res: Response) => {
  try {
    const { geographic_level, time_aggregation, active_only } = req.query;

    let datasets;

    if (active_only === 'true') {
      datasets = await getActiveDatasets();
    } else if (geographic_level || time_aggregation) {
      datasets = await getDatasetsByLevel(
        geographic_level as string,
        time_aggregation as string
      );
    } else {
      datasets = await getAllDatasets();
    }

    res.json({ success: true, data: datasets });
  } catch (error: any) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dataset by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataset = await getDatasetById(parseInt(id));

    if (!dataset) {
      return res.status(404).json({ success: false, error: 'Dataset not found' });
    }

    res.json({ success: true, data: dataset });
  } catch (error: any) {
    console.error('Error fetching dataset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new dataset
router.post('/', async (req: Request, res: Response) => {
  try {
    const { dataset_name, postgres_table, geographic_level, time_aggregation, kpis, is_active } = req.body;

    if (!dataset_name || !postgres_table || !geographic_level || !time_aggregation) {
      return res.status(400).json({
        success: false,
        error: 'dataset_name, postgres_table, geographic_level, and time_aggregation are required',
      });
    }

    const dataset = await createDataset({
      dataset_name,
      postgres_table,
      geographic_level,
      time_aggregation,
      kpis: kpis || [],
      is_active: is_active !== undefined ? is_active : true,
    });

    res.status(201).json({ success: true, data: dataset });
  } catch (error: any) {
    console.error('Error creating dataset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update dataset
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dataset = await updateDataset(parseInt(id), updates);

    if (!dataset) {
      return res.status(404).json({ success: false, error: 'Dataset not found' });
    }

    res.json({ success: true, data: dataset });
  } catch (error: any) {
    console.error('Error updating dataset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete dataset
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDataset(parseInt(id));

    res.json({ success: true, message: 'Dataset deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available KPIs from semantic.json
router.get('/meta/kpis', async (req: Request, res: Response) => {
  try {
    // Read the semantic.json file
    const fs = require('fs');
    const path = require('path');
    const semanticPath = path.join(__dirname, '../../../semantic.json');
    const semanticData = JSON.parse(fs.readFileSync(semanticPath, 'utf-8'));

    // Transform to flat list with category
    const kpis = semanticData.flatMap((category: any) =>
      category.kpi.map((kpi: any) => ({
        name: kpi.name,
        description: kpi.description,
        category: category.category,
      }))
    );

    res.json({ success: true, data: kpis });
  } catch (error: any) {
    console.error('Error reading KPIs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available PostgreSQL tables and views
router.get('/meta/tables', async (req: Request, res: Response) => {
  try {
    const { queryDatabase } = require('../config/database');

    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_name
    `;

    const rows = await queryDatabase<{ table_name: string }>(query);
    const tables = rows.map(row => row.table_name);

    res.json({ success: true, data: tables });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get columns for a specific table
router.get('/meta/tables/:tableName/columns', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { queryDatabase } = require('../config/database');

    const query = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `;

    const rows = await queryDatabase<{ column_name: string; data_type: string }>(query, [tableName]);
    const columns = rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
    }));

    res.json({ success: true, data: columns });
  } catch (error: any) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
