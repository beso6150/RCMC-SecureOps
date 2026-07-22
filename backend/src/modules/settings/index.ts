import { Router } from 'express';
import settingsRoutes from './presentation/settings.routes.js';

export const settingsRouter = Router();
settingsRouter.use('/settings', settingsRoutes);

export {
  departmentService,
  shiftService,
  systemSettingService,
  DEFAULT_SYSTEM_SETTINGS,
} from './application/SettingsService.js';
