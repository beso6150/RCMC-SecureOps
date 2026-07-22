import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { violationsController } from './violations.controller.js';
import {
  addAttachmentsSchema,
  assignViolationSchema,
  closeViolationSchema,
  createViolationSchema,
  listViolationsQuerySchema,
  statisticsQuerySchema,
  syncPullQuerySchema,
  syncPushSchema,
  updateViolationSchema,
  violationIdParamsSchema,
} from './violations.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/parking-locations',
  authorizePermission(PermissionCodes.VIOLATIONS_READ),
  asyncHandler(violationsController.parkingLocations),
);

router.get(
  '/statistics',
  authorizePermission(PermissionCodes.VIOLATIONS_STATS),
  validate(statisticsQuerySchema, 'query'),
  asyncHandler(violationsController.statistics),
);

router.post(
  '/sync/push',
  authorizePermission(PermissionCodes.VIOLATIONS_CREATE),
  validate(syncPushSchema),
  asyncHandler(violationsController.syncPush),
);

router.get(
  '/sync/pull',
  authorizePermission(PermissionCodes.VIOLATIONS_READ),
  validate(syncPullQuerySchema, 'query'),
  asyncHandler(violationsController.syncPull),
);

router.get(
  '/',
  authorizePermission(PermissionCodes.VIOLATIONS_READ),
  validate(listViolationsQuerySchema, 'query'),
  asyncHandler(violationsController.list),
);

router.post(
  '/',
  authorizePermission(PermissionCodes.VIOLATIONS_CREATE),
  validate(createViolationSchema),
  asyncHandler(violationsController.create),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.VIOLATIONS_READ),
  validate(violationIdParamsSchema, 'params'),
  asyncHandler(violationsController.getById),
);

router.patch(
  '/:id',
  authorizePermission(PermissionCodes.VIOLATIONS_UPDATE),
  validate(violationIdParamsSchema, 'params'),
  validate(updateViolationSchema),
  asyncHandler(violationsController.update),
);

router.post(
  '/:id/assign',
  authorizePermission(PermissionCodes.VIOLATIONS_ASSIGN),
  validate(violationIdParamsSchema, 'params'),
  validate(assignViolationSchema),
  asyncHandler(violationsController.assign),
);

router.post(
  '/:id/start',
  authorizePermission(PermissionCodes.VIOLATIONS_UPDATE),
  validate(violationIdParamsSchema, 'params'),
  asyncHandler(violationsController.startProgress),
);

router.post(
  '/:id/close',
  authorizePermission(PermissionCodes.VIOLATIONS_CLOSE),
  validate(violationIdParamsSchema, 'params'),
  validate(closeViolationSchema),
  asyncHandler(violationsController.close),
);

router.post(
  '/:id/attachments',
  authorizePermission(PermissionCodes.VIOLATIONS_UPDATE),
  validate(violationIdParamsSchema, 'params'),
  validate(addAttachmentsSchema),
  asyncHandler(violationsController.addAttachments),
);

router.delete(
  '/:id',
  authorizePermission(PermissionCodes.VIOLATIONS_UPDATE),
  validate(violationIdParamsSchema, 'params'),
  asyncHandler(violationsController.remove),
);

export default router;
