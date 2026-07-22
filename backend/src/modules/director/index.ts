import { Router } from 'express';
import directorRoutes from './presentation/director.routes.js';

export const directorRouter = Router();
directorRouter.use('/director', directorRoutes);

export { directorDashboardService } from './application/DirectorDashboardService.js';
