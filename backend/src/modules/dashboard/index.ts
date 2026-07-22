import { Router } from 'express';
import dashboardRoutes from './presentation/dashboard.routes.js';

export const dashboardRouter = Router();
dashboardRouter.use('/dashboard', dashboardRoutes);

export { dashboardService } from './application/DashboardService.js';
