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
import { cctvController } from './cctv.controller.js';
import {
  cameraRequestIdParamsSchema,
  completeCameraRequestSchema,
  createCameraRequestSchema,
  listCameraRequestsQuerySchema,
  searchPermitsQuerySchema,
} from './cctv.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/dashboard',
  authorizePermission(PermissionCodes.CCTV_DASHBOARD_READ),
  asyncHandler(cctvController.dashboard),
);

router.get(
  '/permits/search',
  authorizePermission(PermissionCodes.VEHICLE_PERMITS_READ),
  validate(searchPermitsQuerySchema, 'query'),
  asyncHandler(cctvController.searchPermits),
);

router.get(
  '/requests',
  authorizePermission(PermissionCodes.CAMERA_REQUESTS_READ),
  validate(listCameraRequestsQuerySchema, 'query'),
  asyncHandler(cctvController.listRequests),
);

router.post(
  '/requests',
  authorizePermission(PermissionCodes.CAMERA_REQUESTS_CREATE),
  validate(createCameraRequestSchema),
  asyncHandler(cctvController.createRequest),
);

router.get(
  '/requests/:id',
  authorizePermission(PermissionCodes.CAMERA_REQUESTS_READ),
  validate(cameraRequestIdParamsSchema, 'params'),
  asyncHandler(cctvController.getRequest),
);

router.post(
  '/requests/:id/start',
  authorizePermission(PermissionCodes.CAMERA_REQUESTS_HANDLE),
  validate(cameraRequestIdParamsSchema, 'params'),
  asyncHandler(cctvController.startRequest),
);

router.post(
  '/requests/:id/complete',
  authorizePermission(PermissionCodes.CAMERA_REQUESTS_HANDLE),
  validate(cameraRequestIdParamsSchema, 'params'),
  validate(completeCameraRequestSchema),
  asyncHandler(cctvController.completeRequest),
);

router.post(
  '/requests/:id/cancel',
  authorizeAnyPermission(
    PermissionCodes.CAMERA_REQUESTS_CREATE,
    PermissionCodes.CAMERA_REQUESTS_HANDLE,
  ),
  validate(cameraRequestIdParamsSchema, 'params'),
  asyncHandler(cctvController.cancelRequest),
);

export default router;
