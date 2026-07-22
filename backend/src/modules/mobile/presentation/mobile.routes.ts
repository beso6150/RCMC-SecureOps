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
import { mobileController } from './mobile.controller.js';
import {
  deviceIdParamsSchema,
  listDevicesQuerySchema,
  registerDeviceSchema,
  syncBatchSchema,
  syncPullQuerySchema,
  unregisterDeviceSchema,
} from './mobile.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/bootstrap',
  authorizeAnyPermission(PermissionCodes.MOBILE_BOOTSTRAP, PermissionCodes.MOBILE_APP_ACCESS),
  asyncHandler(mobileController.bootstrap),
);

router.get(
  '/config',
  authorizeAnyPermission(PermissionCodes.MOBILE_APP_ACCESS, PermissionCodes.MOBILE_BOOTSTRAP),
  asyncHandler(mobileController.config),
);

router.get(
  '/sync',
  authorizePermission(PermissionCodes.MOBILE_SYNC),
  validate(syncPullQuerySchema, 'query'),
  asyncHandler(mobileController.syncPull),
);

router.post(
  '/sync/batch',
  authorizeAnyPermission(PermissionCodes.MOBILE_SYNC, PermissionCodes.MOBILE_OFFLINE_OPERATIONS),
  validate(syncBatchSchema),
  asyncHandler(mobileController.syncBatch),
);

router.post(
  '/device/register',
  authorizeAnyPermission(PermissionCodes.MOBILE_DEVICES_MANAGE_SELF, PermissionCodes.MOBILE_APP_ACCESS),
  validate(registerDeviceSchema),
  asyncHandler(mobileController.registerDevice),
);

router.post(
  '/device/unregister',
  authorizePermission(PermissionCodes.MOBILE_DEVICES_MANAGE_SELF),
  validate(unregisterDeviceSchema),
  asyncHandler(mobileController.unregisterDevice),
);

router.get(
  '/devices',
  authorizeAnyPermission(PermissionCodes.MOBILE_DEVICES_MANAGE_SELF, PermissionCodes.MOBILE_APP_ACCESS),
  asyncHandler(mobileController.listMyDevices),
);

router.get(
  '/devices/all',
  authorizePermission(PermissionCodes.MOBILE_DEVICES_MANAGE_ALL),
  validate(listDevicesQuerySchema, 'query'),
  asyncHandler(mobileController.listAllDevices),
);

router.post(
  '/devices/:id/disable',
  authorizeAnyPermission(
    PermissionCodes.MOBILE_DEVICES_MANAGE_ALL,
    PermissionCodes.MOBILE_DEVICES_MANAGE_SELF,
  ),
  validate(deviceIdParamsSchema, 'params'),
  asyncHandler(mobileController.disableDevice),
);

export default router;
