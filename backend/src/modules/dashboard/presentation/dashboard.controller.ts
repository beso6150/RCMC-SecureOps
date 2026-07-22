import { Request, Response } from 'express';
import { dashboardService } from '../application/DashboardService.js';

export class DashboardController {
  summary = async (req: Request, res: Response): Promise<void> => {
    const data = await dashboardService.getSummary(req.user!);
    res.status(200).json({ success: true, data });
  };
}

export const dashboardController = new DashboardController();
