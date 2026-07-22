import { Router } from 'express';
import communicationsRoutes from './presentation/communications.routes.js';

export const communicationsRouter = Router();
communicationsRouter.use('/communications', communicationsRoutes);

export { internalConversationService } from './application/InternalConversationService.js';
export { internalMessageService } from './application/InternalMessageService.js';
