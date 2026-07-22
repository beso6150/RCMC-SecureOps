import { Router } from 'express';
import incidentsRoutes from './presentation/incidents.routes.js';

export const incidentsRouter = Router();
incidentsRouter.use('/incidents', incidentsRoutes);

export { incidentService } from './application/IncidentService.js';
export { incidentSyncService } from './application/IncidentSyncService.js';
export { incidentPdfService } from './application/IncidentPdfService.js';
export { incidentRepository } from './infrastructure/IncidentRepository.js';
export { incidentOpsService } from './application/IncidentOpsService.js';
export { operationsRoomService } from './application/OperationsRoomService.js';
