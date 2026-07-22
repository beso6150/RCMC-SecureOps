import { Router } from 'express';
import violationsRoutes from './presentation/violations.routes.js';

export const violationsRouter = Router();
violationsRouter.use('/violations', violationsRoutes);

export { violationService } from './application/ViolationService.js';
export { violationStatisticsService } from './application/ViolationStatisticsService.js';
export { violationSyncService } from './application/ViolationSyncService.js';
export { violationRepository } from './infrastructure/ViolationRepository.js';
