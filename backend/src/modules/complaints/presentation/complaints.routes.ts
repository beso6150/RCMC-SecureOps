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
import { complaintsController } from './complaints.controller.js';
import {
  complaintIdParamsSchema,
  createComplaintSchema,
  listComplaintsQuerySchema,
  reviewComplaintSchema,
  statisticsQuerySchema,
  updateComplaintSchema,
} from './complaints.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/statistics',
  authorizePermission(PermissionCodes.COMPLAINTS_READ),
  validate(statisticsQuerySchema, 'query'),
  asyncHandler(complaintsController.statistics),
);

router.get(
  '/',
  authorizePermission(PermissionCodes.COMPLAINTS_READ),
  validate(listComplaintsQuerySchema, 'query'),
  asyncHandler(complaintsController.list),
);

router.post(
  '/',
  authorizePermission(PermissionCodes.COMPLAINTS_CREATE),
  validate(createComplaintSchema),
  asyncHandler(complaintsController.create),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.COMPLAINTS_READ),
  validate(complaintIdParamsSchema, 'params'),
  asyncHandler(complaintsController.getById),
);

router.patch(
  '/:id',
  authorizePermission(PermissionCodes.COMPLAINTS_UPDATE),
  validate(complaintIdParamsSchema, 'params'),
  validate(updateComplaintSchema),
  asyncHandler(complaintsController.update),
);

router.post(
  '/:id/review',
  authorizeAnyPermission(
    PermissionCodes.COMPLAINTS_APPROVE,
    PermissionCodes.COMPLAINTS_REJECT,
    PermissionCodes.COMPLAINTS_UPDATE,
  ),
  validate(complaintIdParamsSchema, 'params'),
  validate(reviewComplaintSchema),
  asyncHandler(complaintsController.review),
);

router.get(
  '/:id/pdf',
  authorizePermission(PermissionCodes.COMPLAINTS_READ),
  validate(complaintIdParamsSchema, 'params'),
  asyncHandler(complaintsController.getPdf),
);

export default router;
