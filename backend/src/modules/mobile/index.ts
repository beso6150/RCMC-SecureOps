import { Router } from 'express';
import mobileRoutes from './presentation/mobile.routes.js';

export const mobileRouter = Router();
mobileRouter.use('/mobile', mobileRoutes);

export { mobileService } from './application/MobileService.js';
export { MOBILE_SYSTEM_SETTINGS } from './application/mobileSettings.js';
