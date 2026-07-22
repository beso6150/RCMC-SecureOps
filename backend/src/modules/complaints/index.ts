import { Router } from 'express';
import complaintsRoutes from './presentation/complaints.routes.js';

export const complaintsRouter = Router();
complaintsRouter.use('/complaints', complaintsRoutes);

export { complaintService } from './application/ComplaintService.js';
export { complaintStatisticsService } from './application/ComplaintStatisticsService.js';
export { complaintRepository } from './infrastructure/ComplaintRepository.js';
