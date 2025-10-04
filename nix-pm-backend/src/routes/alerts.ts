import { Router, Request, Response } from 'express';
import {
  getAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  deleteAlert,
  setAlertEnabled,
} from '../services/alertService';
import { calculateKPIStatistics, getAlertStatistics } from '../services/statisticsService';
import { evaluateThresholdAlert } from '../services/thresholdService';
import { CreateAlertSchema } from '../types/alerts';

const router = Router();

// GET /api/alerts - List all alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { enabled, kpi_name, alert_type } = req.query;

    const alerts = await getAlerts({
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      kpi_name: kpi_name as string,
      alert_type: alert_type as string,
    });

    res.json({ success: true, data: alerts });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alerts/:id - Get single alert
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alert = await getAlertById(id);

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alerts - Create new alert
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = CreateAlertSchema.parse(req.body);

    const alert = await createAlert(validatedData);

    res.status(201).json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error creating alert:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/alerts/:id - Update alert
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alert = await updateAlert(id, req.body);

    res.json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error updating alert:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteAlert(id);

    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alerts/:id/enable - Enable alert
router.put('/:id/enable', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alert = await setAlertEnabled(id, true);

    res.json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error enabling alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alerts/:id/disable - Disable alert
router.put('/:id/disable', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alert = await setAlertEnabled(id, false);

    res.json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error disabling alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/alerts/:id/test - Test alert (dry run)
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alert = await getAlertById(id);

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    if (alert.alert_type !== 'threshold') {
      return res.status(400).json({
        success: false,
        error: 'Only threshold alerts can be tested currently',
      });
    }

    const result = await evaluateThresholdAlert(alert);

    res.json({
      success: true,
      data: {
        would_trigger: result.triggered,
        current_value: result.value,
        reason: result.reason,
        threshold: result.threshold,
      },
    });
  } catch (error: any) {
    console.error('Error testing alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alerts/:id/statistics - Get alert statistics
router.get('/:id/statistics', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alert = await getAlertById(id);

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    // Get cached statistics
    let stats = await getAlertStatistics(id);

    // If no cached stats or older than 1 hour, recalculate
    if (!stats || (new Date().getTime() - new Date(stats.calculated_at).getTime()) > 3600000) {
      const freshStats = await calculateKPIStatistics(
        alert.kpi_name,
        alert.dataset_name,
        alert.config.time_window
      );

      stats = {
        id: 0,
        alert_id: id,
        calculated_at: new Date(),
        ...freshStats,
      };
    }

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching alert statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
