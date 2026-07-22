import { Router } from 'express';
import shiftsRoutes from './presentation/shifts.routes.js';

export const shiftsRouter = Router();
shiftsRouter.use('/shifts', shiftsRoutes);

export { shiftRosterService } from './application/ShiftRosterService.js';
