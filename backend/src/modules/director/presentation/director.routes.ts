import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { directorController } from './director.controller.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/dashboard',
  authorizePermission(PermissionCodes.DIRECTOR_DASHBOARD_READ),
  asyncHandler(directorController.dashboard),
);

export default router;
