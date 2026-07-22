import { Router } from 'express';
import cctvOperationsRoutes from './presentation/cctvOperations.routes.js';

export const cctvOperationsRouter = Router();
cctvOperationsRouter.use('/cctv-operations', cctvOperationsRoutes);

export { cctvOperationsService } from './application/CctvOperationsService.js';
