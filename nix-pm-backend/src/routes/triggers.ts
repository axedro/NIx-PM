import { Router, Request, Response } from 'express';
import {
  getAlertTriggers,
  getAllRecentTriggers,
  resolveAlertTrigger,
} from '../services/thresholdService';

const router = Router();

// GET /api/triggers - Get all recent triggers
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const triggers = await getAllRecentTriggers(limit);

    res.json({ success: true, data: triggers });
  } catch (error: any) {
    console.error('Error fetching triggers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/triggers/alert/:alertId - Get triggers for specific alert
router.get('/alert/:alertId', async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.alertId);
    const limit = parseInt(req.query.limit as string) || 50;
    const triggers = await getAlertTriggers(alertId, limit);

    res.json({ success: true, data: triggers });
  } catch (error: any) {
    console.error('Error fetching alert triggers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/triggers/:id/resolve - Resolve a trigger
router.put('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await resolveAlertTrigger(id);

    res.json({ success: true, message: 'Trigger resolved successfully' });
  } catch (error: any) {
    console.error('Error resolving trigger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
