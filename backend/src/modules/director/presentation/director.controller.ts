import { Request, Response } from 'express';
import { directorDashboardService } from '../application/DirectorDashboardService.js';

export class DirectorController {
  dashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await directorDashboardService.getDashboard(req.user!);
    res.status(200).json({ success: true, data });
  };
}

export const directorController = new DirectorController();
