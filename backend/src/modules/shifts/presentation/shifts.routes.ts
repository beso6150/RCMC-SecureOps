import { Router } from 'express';
import {
  authenticateJwt,
  authorizeAnyPermission,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { shiftsController } from './shifts.controller.js';
import {
  handoverIdParamsSchema,
  listPersonnelQuerySchema,
  setOperationalStatusSchema,
  shiftStatisticsQuerySchema,
  updateCycleConfigSchema,
  upsertHandoverSchema,
  userIdParamsSchema,
} from './shifts.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/overview',
  authorizePermission(PermissionCodes.SHIFTS_READ),
  asyncHandler(shiftsController.overview),
);

router.get(
  '/ops-board',
  authorizeAnyPermission(PermissionCodes.SHIFTS_READ, PermissionCodes.DASHBOARD_READ),
  asyncHandler(shiftsController.opsBoard),
);

router.get(
  '/personnel',
  authorizePermission(PermissionCodes.SHIFTS_READ),
  validate(listPersonnelQuerySchema, 'query'),
  asyncHandler(shiftsController.listPersonnel),
);

router.get(
  '/assignable',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_CREATE,
    PermissionCodes.INCIDENTS_HANDLE,
  ),
  asyncHandler(shiftsController.listAssignable),
);

router.patch(
  '/personnel/:userId/status',
  authorizePermission(PermissionCodes.SHIFTS_UPDATE),
  validate(userIdParamsSchema, 'params'),
  validate(setOperationalStatusSchema),
  asyncHandler(shiftsController.setOperationalStatus),
);

router.patch(
  '/cycle-config',
  authorizePermission(PermissionCodes.SHIFTS_MANAGE),
  validate(updateCycleConfigSchema),
  asyncHandler(shiftsController.updateCycleConfig),
);

router.get(
  '/handover',
  authorizePermission(PermissionCodes.SHIFTS_HANDOVER),
  asyncHandler(shiftsController.handoverBoard),
);

router.post(
  '/handover',
  authorizePermission(PermissionCodes.SHIFTS_HANDOVER),
  validate(upsertHandoverSchema),
  asyncHandler(shiftsController.upsertHandover),
);

router.post(
  '/handover/:id/approve-handover',
  authorizePermission(PermissionCodes.SHIFTS_HANDOVER),
  validate(handoverIdParamsSchema, 'params'),
  asyncHandler(shiftsController.approveHandover),
);

router.post(
  '/handover/:id/approve-takeover',
  authorizePermission(PermissionCodes.SHIFTS_HANDOVER),
  validate(handoverIdParamsSchema, 'params'),
  asyncHandler(shiftsController.approveTakeover),
);

router.get(
  '/statistics',
  authorizePermission(PermissionCodes.SHIFTS_STATS),
  validate(shiftStatisticsQuerySchema, 'query'),
  asyncHandler(shiftsController.statistics),
);

export default router;
