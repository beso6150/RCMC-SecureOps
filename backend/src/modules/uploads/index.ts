import { Router } from 'express';
import uploadsRoutes from './presentation/uploads.routes.js';

export const uploadsRouter = Router();
uploadsRouter.use('/uploads', uploadsRoutes);
