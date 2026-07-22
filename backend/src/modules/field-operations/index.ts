import { Router } from 'express';
import fieldOperationsRoutes from './presentation/fieldOperations.routes.js';

export const fieldOperationsRouter = Router();
fieldOperationsRouter.use('/field-operations', fieldOperationsRoutes);

export { fieldOperationsService } from './application/FieldOperationsService.js';
