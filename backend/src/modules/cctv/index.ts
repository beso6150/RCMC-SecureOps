import { Router } from 'express';
import cctvRoutes from './presentation/cctv.routes.js';

export const cctvRouter = Router();
cctvRouter.use('/cctv', cctvRoutes);

export { cameraRequestService } from './application/CameraRequestService.js';
export { cctvDashboardService } from './application/CctvDashboardService.js';
export { vehiclePermitSearchService } from './application/VehiclePermitSearchService.js';
export { cameraRequestRepository } from './infrastructure/CameraRequestRepository.js';
export { vehiclePermitRepository } from './infrastructure/VehiclePermitRepository.js';
