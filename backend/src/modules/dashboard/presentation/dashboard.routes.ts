import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/summary',
  authorizePermission(PermissionCodes.DASHBOARD_READ),
  asyncHandler(dashboardController.summary),
);

export default router;
