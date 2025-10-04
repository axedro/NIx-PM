import { Router, Request, Response } from 'express';
import { calculateKPIStatistics, getKPITimeseries } from '../services/statisticsService';
import { TimeWindow } from '../types/alerts';

const router = Router();

// POST /api/statistics/calculate - Calculate KPI statistics
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { kpi_name, dataset_name, time_window } = req.body;

    if (!kpi_name || !dataset_name) {
      return res.status(400).json({
        success: false,
        error: 'kpi_name and dataset_name are required',
      });
    }

    const stats = await calculateKPIStatistics(
      kpi_name,
      dataset_name,
      (time_window as TimeWindow) || '1day'
    );

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error calculating statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/statistics/timeseries - Get KPI timeseries data
router.post('/timeseries', async (req: Request, res: Response) => {
  try {
    const { kpi_name, dataset_name, limit } = req.body;

    if (!kpi_name || !dataset_name) {
      return res.status(400).json({
        success: false,
        error: 'kpi_name and dataset_name are required',
      });
    }

    const data = await getKPITimeseries(
      kpi_name,
      dataset_name,
      limit || 100
    );

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching timeseries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
