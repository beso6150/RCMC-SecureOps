import { Router } from 'express';
import visitorsRoutes from './presentation/visitors.routes.js';

export const visitorsRouter = Router();
visitorsRouter.use('/visitors', visitorsRoutes);

export { visitorService, hostService } from './application/VisitorService.js';
export { visitArrivalService } from './application/VisitArrivalService.js';
export { visitStatisticsService } from './application/VisitStatisticsService.js';
export { visitEmailService } from './application/VisitEmailService.js';
export { floorService, meetingRoomService } from './application/FacilityService.js';
export { visitorRepository } from './infrastructure/VisitorRepository.js';
